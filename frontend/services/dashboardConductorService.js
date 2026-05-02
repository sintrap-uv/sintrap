 import { supabase } from "./supabase";

/**
 * Carga todos los datos del dashboard del conductor en paralelo.
 * @param {string} conductorId - UUID del conductor autenticado
 */
export async function getDashboardConductor(conductorId) {
  try {
    const hoy = new Date().toISOString().split("T")[0];

    // ── Turno de hoy + vehículo + ruta ─────────────────────────────
    const { data: turno, error: eTurno } = await supabase
      .from("turnos")
      .select(`
        id, estado, fecha, hora_inicio_real, hora_fin_real,
        ruta_horarios (
          nombre_turno, hora_inicio, hora_fin,
          rutas ( id, numero_ruta, nombre, color )
        ),
        vehiculos (
          id, placa, 
          tipo_vehiculo:tipo_vehiculo_id ( nombre, capacidad_max )
        )
      `)
      .eq("conductor_id", conductorId)
      .eq("fecha", hoy)
      .maybeSingle();

    if (eTurno) throw eTurno;
    if (!turno) return { success: true, data: null }; // sin turno hoy

    const rutaId    = turno.ruta_horarios?.rutas?.id;
    const vehiculoId = turno.vehiculos?.id;

    // ── Carga en paralelo ───────────────────────────────────────────
    const [
      { data: paradasData },
      { data: pasajerosData },
      { data: historialData },
      { data: reportesPendientes },
    ] = await Promise.all([

      // Paradas de la ruta con usuarios por parada
      rutaId
        ? supabase
            .from("ruta_paradas")
            .select("orden, tiempo_desde_inicio, paradas ( id, nombre )")
            .eq("ruta_id", rutaId)
            .order("orden")
        : Promise.resolve({ data: [] }),

      // Cuántos usuarios suben en cada parada
      rutaId
        ? supabase
            .from("usuario_ruta")
            .select("parada_origen_id, paradas!usuario_ruta_parada_origen_id_fkey ( nombre )")
            .eq("ruta_id", rutaId)
            .eq("activa", true)
        : Promise.resolve({ data: [] }),

      // Historial últimos 4 turnos (excluyendo hoy)
      supabase
        .from("turnos")
        .select(`
          fecha, estado, hora_inicio_real, hora_fin_real,
          ruta_horarios ( nombre_turno, hora_inicio, hora_fin,
            rutas ( numero_ruta )
          ),
          vehiculo:vehiculos ( placa )
        `)
        .eq("conductor_id", conductorId)
        .neq("fecha", hoy)
        .order("fecha", { ascending: false })
        .limit(4),

      // Reportes pendientes que involucran al conductor
      supabase
        .from("reportes")
        .select("id, tipo, descripcion, estado, fecha")
        .eq("estado", "pendiente")
        .limit(3),
    ]);

    // ── Agrupar usuarios por parada ─────────────────────────────────
    const usuariosPorParada = {};
    (pasajerosData ?? []).forEach((ur) => {
      const pid = ur.parada_origen_id;
      usuariosPorParada[pid] = (usuariosPorParada[pid] ?? 0) + 1;
    });

    // ── Paradas enriquecidas con conteo ─────────────────────────────
    const paradas = (paradasData ?? []).map((rp) => ({
      id:              rp.paradas.id,
      nombre:          rp.paradas.nombre,
      orden:           rp.orden,
      eta:             rp.tiempo_desde_inicio,
      usuariosSuben:   usuariosPorParada[rp.paradas.id] ?? 0,
    }));

    // ── Resumen del turno ───────────────────────────────────────────
    const ruta     = turno.ruta_horarios?.rutas;
    const vehiculo = turno.vehiculos;
    const horario  = turno.ruta_horarios;
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
          nombreTurno:    horario?.nombre_turno,
          horaInicio:     horario?.hora_inicio,
          horaFin:        horario?.hora_fin,
        },
        ruta: ruta
          ? {
              id:         ruta.id,
              numeroRuta: ruta.numero_ruta,
              nombre:     ruta.nombre,
              color:      ruta.color,
            }
          : null,
        vehiculo: vehiculo
          ? {
              id:       vehiculo.id,
              placa:    vehiculo.placa,
              capacidad: vehiculo.tipo_vehiculo?.capacidad_max ?? 0,
              tipo:     vehiculo.tipo_vehiculo?.nombre ?? "Buseta",
            }
          : null,
        paradas,
        totalPasajeros,
        historial: (historialData ?? []).map((h) => ({
          fecha:       h.fecha,
          estado:      h.estado,
          nombreTurno: h.ruta_horarios?.nombre_turno,
          horaInicio:  h.ruta_horarios?.hora_inicio,
          horaFin:     h.ruta_horarios?.hora_fin,
          numeroRuta:  h.ruta_horarios?.rutas?.numero_ruta,
          placa:       h.vehiculo?.placa,
          horaInicioReal: h.hora_inicio_real,
          horaFinReal:    h.hora_fin_real,
        })),
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