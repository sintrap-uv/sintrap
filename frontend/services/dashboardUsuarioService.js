 import { supabase } from "./supabase";

/**
 * Obtiene toda la información del dashboard del usuario.
 * Estrategia: dos fases paralelas para evitar joins anidados frágiles.
 *
 * FASE 1 — datos estáticos (ruta, paradas, horario, notifs): Promise.all
 * FASE 2 — datos en tiempo real (posición bus): siempre via RPC SECURITY DEFINER
 *
 * @param {string} userId - UUID del usuario autenticado
 */
export async function getDashboardUsuario(userId) {
  try {
    // ── FASE 1A: Ruta asignada ─────────────────────────────────────────
    const { data: asignacion, error: eAsig } = await supabase
      .from("usuario_ruta")
      .select(`
        id, activa, ruta_id,
        rutas ( id, numero_ruta, nombre, color, horario_inicio, horario_fin ),
        parada_origen:paradas!usuario_ruta_parada_origen_id_fkey  ( id, nombre ),
        parada_destino:paradas!usuario_ruta_parada_destino_id_fkey ( id, nombre )
      `)
      .eq("usuario_id", userId)
      .eq("activa", true)
      .maybeSingle();

    if (eAsig) throw eAsig;
    if (!asignacion) return { success: true, data: null };

    const rutaId = asignacion.rutas.id;

    // ── FASE 1B: datos estáticos en paralelo ──────────────────────────
    const [
      { data: paradasData,  error: eParadas },
      { data: vehiculoData },
      { data: horariosData, error: eHorarios },
      { data: notifData },
    ] = await Promise.all([
      supabase
        .from("ruta_paradas")
        .select("orden, tiempo_desde_inicio, paradas ( id, nombre )")
        .eq("ruta_id", rutaId)
        .order("orden"),

      // Vehículo con tipo y conductor completo
      // NOTA: no se usa la columna "capacidad" — viene de tipo_vehiculo
      supabase
        .from("vehiculos")
        .select(`
          id, placa, activo,
          tipo_vehiculo:tipo_vehiculo_id ( id, nombre, capacidad_max ),
          conductor:conductor_id ( id, nombre, cedula, celular, avatar_url )
        `)
        .eq("ruta_id", rutaId)
        .eq("activo", true)
        .limit(1)
        .maybeSingle(),

      supabase
        .from("ruta_horarios")
        .select(`
          nombre_turno, hora_inicio, hora_fin,
          turnos (
            id, estado, hora_inicio_real,
            conductor:conductor_id ( nombre, celular, cedula, avatar_url )
          )
        `)
        .eq("ruta_id", rutaId)
        .order("hora_inicio"),

      supabase
        .from("notificaciones")
        .select("id, tipo, titulo, mensaje, metadata, leida, fecha")
        .eq("usuario_id", userId)
        .eq("leida", false)
        .order("fecha", { ascending: false })
        .limit(3),
    ]);

    if (eParadas)  throw eParadas;
    if (eHorarios) throw eHorarios;

    // ── Contar usuarios asignados a esta ruta (para asientos disponibles)
    const { count: usuariosEnRuta } = await supabase
      .from("usuario_ruta")
      .select("*", { count: "exact", head: true })
      .eq("ruta_id", rutaId)
      .eq("activa", true);

    // ── FASE 2: posición del bus via RPC ──────────────────────────────
    const { data: busUbicacion, error: eRpc } = await supabase
      .rpc("get_ubicacion_conductor_ruta", { p_ruta_id: rutaId })
      .maybeSingle();

    if (eRpc) console.warn("RPC ubicacion conductor:", eRpc.message);

    // ── Turno activo de hoy ────────────────────────────────────────────
    const turnoHoy = (horariosData ?? [])
      .flatMap((h) =>
        (h.turnos ?? []).map((t) => ({
          ...t,
          nombre_turno: h.nombre_turno,
          hora_inicio:  h.hora_inicio,
          hora_fin:     h.hora_fin,
        }))
      )
      .find((t) => t.estado === "en_curso") ?? null;

    // ── Capacidad y asientos disponibles ──────────────────────────────
    const capacidadMax   = vehiculoData?.tipo_vehiculo?.capacidad_max ?? 0;
    const asientosOcupados  = usuariosEnRuta ?? 0;
    const asientosDisponibles = Math.max(0, capacidadMax - asientosOcupados);

    // ── Estado del servicio ───────────────────────────────────────────
    let estadoServicio = "sin_servicio";
    if (turnoHoy?.estado === "en_curso")    estadoServicio = "en_ruta";
    else if (turnoHoy?.estado === "programado") estadoServicio = "proximamente";
    else if (vehiculoData?.activo)          estadoServicio = "disponible";

    return {
      success: true,
      data: {
        asignacion: {
          rutaId,
          numeroRuta:    asignacion.rutas.numero_ruta,
          nombreRuta:    asignacion.rutas.nombre,
          color:         asignacion.rutas.color,
          horarioInicio: asignacion.rutas.horario_inicio,
          horarioFin:    asignacion.rutas.horario_fin,
          paradaOrigen:  asignacion.parada_origen,
          paradaDestino: asignacion.parada_destino,
        },
        paradas: (paradasData ?? []).map((rp) => ({
          id:     rp.paradas.id,
          nombre: rp.paradas.nombre,
          orden:  rp.orden,
          eta:    rp.tiempo_desde_inicio,
        })),
        bus: vehiculoData
          ? {
              placa:     vehiculoData.placa,
              tipo:      vehiculoData.tipo_vehiculo?.nombre ?? "Buseta",
              capacidad: capacidadMax,
              asientosDisponibles,
              estadoServicio,
              enRuta:    busUbicacion?.en_ruta   ?? false,
              velocidad: Number(busUbicacion?.velocidad ?? 0),
              ubicacion: busUbicacion ?? null,
              ultimaActualizacion: busUbicacion?.updated_at ?? null,
              // Conductor desde el vehículo
              conductor: vehiculoData.conductor ?? null,
            }
          : null,
        turnoHoy,
        horarios:       horariosData ?? [],
        notificaciones: notifData    ?? [],
      },
    };
  } catch (error) {
    console.error("Error en getDashboardUsuario:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Calcula ETA del bus a la parada del usuario.
 */
export function calcularETA(distanciaMetros, velocidadKmh = 30) {
  if (!distanciaMetros || distanciaMetros <= 0) return 0;
  const velocidadMpm = (velocidadKmh * 1000) / 60;
  return Math.max(1, Math.round(distanciaMetros / velocidadMpm));
}

/** Marca una notificación como leída. */
export async function marcarNotifLeida(notifId) {
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", notifId);
  if (error) console.error("Error marcando notif:", error.message);
}

/** "06:00:00" → "6:00 AM" */
export function formatearHora(hora) {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const periodo = h >= 12 ? "PM" : "AM";
  const hora12  = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${String(m).padStart(2, "0")} ${periodo}`;
}