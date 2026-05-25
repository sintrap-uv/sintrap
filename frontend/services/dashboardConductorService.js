import { supabase } from "./supabase";

/**
 * Carga todos los datos del dashboard del conductor en paralelo.
 * @param {string} conductorId - UUID del conductor autenticado
 */
export async function getDashboardConductor(conductorId) {
  try {
    if (!conductorId) return { success: false, error: "Conductor ID requerido" };

    // Fecha local Colombia (evita bug UTC que adelanta un día)
    const hoy = new Date().toLocaleDateString("en-CA");

    // ── Turno de hoy ────────────────────────────────────────────────
    const { data: turnos, error: eTurno } = await supabase
      .from("turnos")
      .select(`
        id, estado, fecha, hora_inicio_real, hora_fin_real,
        vehiculo_id,
        vehiculos (
          id, placa,
          tipo_vehiculo:tipo_vehiculo_id ( nombre, capacidad_max )
        )
      `)
      .eq("conductor_id", conductorId)
      .eq("fecha", hoy)
      .in("estado", ["en_curso", "programado"])
      .order("estado", { ascending: false })
      .limit(1);

    if (eTurno) throw eTurno;
    if (!turnos || turnos.length === 0) return { success: true, data: null };

    const turno      = turnos[0];
    const vehiculoId = turno.vehiculo_id;

    // ── Ruta asignada: intenta turno_id primero, fallback vehiculo_id ─
    let rutaHorario = null;

    // Intento 1: por turno_id (más preciso cuando está disponible)
    const { data: rh1, error: e1 } = await supabase
      .from("ruta_horarios")
      .select(`
        id, nombre_turno, hora_inicio, hora_fin, ruta_id,
        rutas ( id, numero_ruta, nombre, color )
      `)
      .eq("turno_id", turno.id)
      .eq("activo", true)
      .limit(1)
      .maybeSingle();

    if (!e1 && rh1) {
      rutaHorario = rh1;
    } else {
      // Intento 2: por vehiculo_id (fallback)
      const { data: rh2, error: e2 } = await supabase
        .from("ruta_horarios")
        .select(`
          id, nombre_turno, hora_inicio, hora_fin, ruta_id,
          rutas ( id, numero_ruta, nombre, color )
        `)
        .eq("vehiculo_id", vehiculoId)
        .eq("activo", true)
        .limit(1)
        .maybeSingle();

      if (e2) throw e2;
      rutaHorario = rh2;
    }

    if (!rutaHorario) return { success: true, data: null };

    const rutaId = rutaHorario.ruta_id;
    const ruta   = rutaHorario.rutas;

    if (!ruta) return { success: true, data: null };

    // ── Trayecto WKT via RPC ────────────────────────────────────────
    let trayectoWKT = null;
    if (rutaId) {
      const { data: wkt, error: eWkt } = await supabase
        .rpc("get_trayecto_wkt", { p_ruta_id: rutaId });
      if (!eWkt) trayectoWKT = wkt;
    }

    // ── Carga en paralelo ───────────────────────────────────────────
    const [
      { data: paradasData },
      { data: pasajerosData },
      { data: historialData },
      { data: reportesPendientes },
    ] = await Promise.all([

      // Paradas con coordenadas
      rutaId
        ? supabase
            .from("ruta_paradas")
            .select("orden, tiempo_desde_inicio, paradas ( id, nombre, latitud, longitud )")
            .eq("ruta_id", rutaId)
            .order("orden")
        : Promise.resolve({ data: [] }),

      // Usuarios que suben en cada parada
      rutaId
        ? supabase
            .from("usuario_ruta")
            .select("parada_origen_id, paradas!usuario_ruta_parada_origen_id_fkey ( nombre )")
            .eq("ruta_id", rutaId)
            .eq("activa", true)
        : Promise.resolve({ data: [] }),

      // Historial últimos 5 turnos completados
      supabase
        .from("turnos")
        .select(`
          fecha, estado, hora_inicio_real, hora_fin_real,
          vehiculo_id,
          vehiculo:vehiculos ( placa )
        `)
        .eq("conductor_id", conductorId)
        .eq("estado", "completado")
        .order("fecha", { ascending: false })
        .limit(5),

      // Reportes pendientes
      supabase
        .from("reportes")
        .select("id, tipo, descripcion, estado, fecha")
        .eq("estado", "pendiente")
        .limit(3),
    ]);

    // ── Historial con nombre de ruta ────────────────────────────────
    const historialConRutas = await Promise.all(
      (historialData ?? []).map(async (h) => {
        const { data: rh } = await supabase
          .from("ruta_horarios")
          .select("nombre_turno, hora_inicio, hora_fin, rutas ( numero_ruta )")
          .eq("vehiculo_id", h.vehiculo_id)
          .limit(1)
          .maybeSingle();
        return {
          fecha:          h.fecha,
          estado:         h.estado,
          nombreTurno:    rh?.nombre_turno,
          horaInicio:     rh?.hora_inicio,
          horaFin:        rh?.hora_fin,
          numeroRuta:     rh?.rutas?.numero_ruta,
          placa:          h.vehiculo?.placa,
          horaInicioReal: h.hora_inicio_real,
          horaFinReal:    h.hora_fin_real,
        };
      })
    );

    // ── Usuarios por parada ─────────────────────────────────────────
    const usuariosPorParada = {};
    (pasajerosData ?? []).forEach((ur) => {
      const pid = ur.parada_origen_id;
      usuariosPorParada[pid] = (usuariosPorParada[pid] ?? 0) + 1;
    });

    // ── Paradas enriquecidas ────────────────────────────────────────
    const paradas = (paradasData ?? []).map((rp) => ({
      id:            rp.paradas.id,
      nombre:        rp.paradas.nombre,
      latitud:       rp.paradas.latitud,
      longitud:      rp.paradas.longitud,
      orden:         rp.orden,
      eta:           rp.tiempo_desde_inicio,
      usuariosSuben: usuariosPorParada[rp.paradas.id] ?? 0,
    }));

    const vehiculo       = turno.vehiculos;
    const totalPasajeros = Object.values(usuariosPorParada).reduce((a, b) => a + b, 0);

    return {
      success: true,
      data: {
        turno: {
          id:             turno.id,
          estado:         turno.estado,
          fecha:          turno.fecha,
          horaInicioReal: turno.hora_inicio_real,
          horaFinReal:    turno.hora_fin_real,
          nombreTurno:    rutaHorario.nombre_turno,
          horaInicio:     rutaHorario.hora_inicio,
          horaFin:        rutaHorario.hora_fin,
        },
        ruta: {
          id:         ruta.id,
          numeroRuta: ruta.numero_ruta,
          nombre:     ruta.nombre,
          color:      ruta.color,
          trayecto:   trayectoWKT,
        },
        vehiculo: vehiculo ? {
          id:        vehiculo.id,
          placa:     vehiculo.placa,
          capacidad: vehiculo.tipo_vehiculo?.capacidad_max ?? 0,
          tipo:      vehiculo.tipo_vehiculo?.nombre ?? "Buseta",
        } : null,
        paradas,
        totalPasajeros,
        historial:          historialConRutas,
        reportesPendientes: reportesPendientes ?? [],
      },
    };
  } catch (error) {
    console.error("Error en getDashboardConductor:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza el estado del turno activo del conductor.
 * Estados válidos: 'en_curso' | 'completado' | 'cancelado'
 */
export async function actualizarEstadoTurno(turnoId, nuevoEstado) {
  try {
    const cambios = { estado: nuevoEstado };
    if (nuevoEstado === "completado") {
      cambios.hora_fin_real = new Date().toISOString();
    } else if (nuevoEstado === "en_curso") {
      cambios.hora_inicio_real = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from("turnos")
      .update(cambios)
      .eq("id", turnoId)
      .select()
      .single();
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error actualizando turno:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Actualiza la ubicación del conductor en la BD.
 */
export async function actualizarUbicacionConductor(conductorId, latitud, longitud, velocidad = null) {
  try {
    if (!conductorId || latitud == null || longitud == null)
      return { success: false, error: "Parámetros incompletos" };

    const { data, error } = await supabase
      .from("ubicacion_conductor")
      .upsert(
        {
          conductor_id: conductorId,
          latitud,
          longitud,
          velocidad,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "conductor_id" }
      )
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error en actualizarUbicacionConductor:", error.message);
    return { success: false, error: error.message };
  }
}

/** "06:00:00" → "6:00 AM" */
export function formatearHora(hora) {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const periodo = h >= 12 ? "PM" : "AM";
  const hora12  = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${String(m).padStart(2, "0")} ${periodo}`;
}

/** Nombre legible del turno */
export function nombreTurno(turno) {
  const map = { manana: "Mañana", tarde: "Tarde", noche: "Noche" };
  return map[turno] ?? turno;
}