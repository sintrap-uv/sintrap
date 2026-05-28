import { supabase } from "./supabase";

/**
 * Obtiene TODOS los turnos de un conductor (para MisTurnos)
 * @param {string} conductorId - UUID del conductor
 */
export async function getTurnosConductor(conductorId) {
  try {
    const { data, error } = await supabase.rpc('get_conductor_turnos', {
      p_conductor_id: conductorId,
    });

    if (error) {
      console.error("RPC Error:", error);
      return { success: false, error: error.message };
    }

    const turnos = Array.isArray(data)
      ? data.map((turno) => ({
          turno_id: turno.turno_id,
          fecha: turno.fecha,
          estado: turno.estado,
          hora_inicio_real: turno.hora_inicio_real,
          hora_fin_real: turno.hora_fin_real,
          numero_ruta: turno.numero_ruta,
          ruta_nombre: turno.ruta_nombre,
          vehiculo_id: turno.vehiculo_id,
          placa: turno.placa,
          vehiculo_tipo: turno.vehiculo_tipo,
          capacidad: turno.capacidad,
          hora_inicio: turno.hora_inicio,
          hora_fin: turno.hora_fin,
          cantidad_pasajeros: turno.cantidad_pasajeros || 0,
          dias: {
            lunes: turno.lunes,
            martes: turno.martes,
            miercoles: turno.miercoles,
            jueves: turno.jueves,
            viernes: turno.viernes,
            sabado: turno.sabado,
            domingo: turno.domingo,
          },
        }))
      : [];

    return { success: true, data: turnos };
  } catch (err) {
    console.error("Catch Error:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Carga todos los datos del dashboard del conductor.
 * @param {string} conductorId - UUID del conductor autenticado
 *
 * Obtiene el dashboard del conductor con su turno actual, ruta y paradas.
 * Error anterior: "JSON object requested, multiple (or no) rows returned"
 * Causa: El conductor podía tener múltiples turnos (programado, en curso, etc)
 * Solución: Filtrar por fecha = hoy y estado en ['en_curso', 'programado']
 */
export const getDashboardConductor = async (conductorId) => {
  try {
    if (!conductorId) {
      return { success: false, error: "Conductor ID requerido" };
    }

    // Fecha local Colombia (evita bug UTC que adelanta un día)
    const hoy = new Date().toLocaleDateString("en-CA");

    // ── TURNO DE HOY ────────────────────────────────────────────────
    const { data: turnos, error: eTurno } = await supabase
      .from("turnos")
      .select(
        `
        id,
        conductor_id,
        vehiculo_id,
        fecha,
        estado,
        hora_inicio_real,
        hora_fin_real
      `
      )
      .eq("conductor_id", conductorId)
      .eq("fecha", hoy)
      .in("estado", ["en_curso", "programado"])
      .order("estado", { ascending: false }) // en_curso primero
      .limit(1);

    if (eTurno) {
      console.error("Error obteniendo turnos:", eTurno);
      return { success: false, error: eTurno.message };
    }

    // Si no hay turno hoy, retornar null (sin ruta asignada)
    if (!turnos || turnos.length === 0) {
      return { success: true, data: null };
    }

    const turno = turnos[0];

    // ── INFORMACIÓN DEL VEHÍCULO ────────────────────────────────────
    const { data: vehiculo, error: errorVehiculo } = await supabase
      .from("vehiculos")
      .select(`
        id, 
        placa, 
        conductor_id, 
        tipo_vehiculo_id,
        tipo_vehiculo ( id, nombre, capacidad_max )
      `)
      .eq("id", turno.vehiculo_id)
      .maybeSingle();

    if (errorVehiculo) {
      console.error("Error obteniendo vehículo:", errorVehiculo);
    }

    // ── HORARIO DE LA RUTA ──────────────────────────────────────────
    const { data: horarios, error: errorHorarios } = await supabase
      .from("ruta_horarios")
      .select(
        `
        id,
        ruta_id,
        nombre_turno,
        hora_inicio,
        hora_fin,
        vehiculo_id,
        rutas(id, numero_ruta, nombre, color, trayecto)
      `
      )
      .eq("turno_id", turno.id)
      .eq("activo", true)
      .limit(1);

    if (errorHorarios) {
      console.error("Error obteniendo horarios:", errorHorarios);
      return { success: false, error: errorHorarios.message };
    }

    // Si no hay horario, no hay ruta asignada
    if (!horarios || horarios.length === 0) {
      return { success: true, data: null };
    }

    const horario = horarios[0];
    const ruta = horario.rutas;

    if (!ruta) {
      return { success: true, data: null };
    }

    // ── PARADAS DE LA RUTA ──────────────────────────────────────────
    const { data: paradasRuta, error: errorParadas } = await supabase
      .from("ruta_paradas")
      .select(
        `
        id,
        parada_id,
        orden,
        tiempo_desde_inicio,
        paradas(id, nombre, latitud, longitud, descripcion)
      `
      )
      .eq("ruta_id", ruta.id)
      .order("orden", { ascending: true });

    if (errorParadas) {
      console.error("Error obteniendo paradas:", errorParadas);
    }

    // ── USUARIOS POR PARADA ─────────────────────────────────────────
    const { data: pasajeros, error: errorPasajeros } = await supabase
      .from("usuario_ruta")
      .select(`
        parada_origen_id,
        paradas!usuario_ruta_parada_origen_id_fkey ( id, nombre )
      `)
      .eq("ruta_id", ruta.id)
      .eq("activa", true);

    if (errorPasajeros) {
      console.error("Error obteniendo pasajeros:", errorPasajeros);
    }

    // ── UBICACIÓN ACTUAL DEL CONDUCTOR ──────────────────────────────
    const { data: ubicacion, error: errorUbicacion } = await supabase
      .from("ubicacion_conductor")
      .select("latitud, longitud, velocidad, updated_at")
      .eq("conductor_id", conductorId)
      .maybeSingle();

    if (errorUbicacion && errorUbicacion.code !== "PGRST116") {
      console.warn("Advertencia obteniendo ubicación:", errorUbicacion);
    }

    // ── HISTORIAL DE TURNOS COMPLETADOS ─────────────────────────────
    const { data: historial, error: errorHistorial } = await supabase
      .from("turnos")
      .select(
        `
        id,
        fecha,
        estado,
        hora_inicio_real,
        hora_fin_real,
        vehiculos(placa),
        ruta_horarios!inner(ruta_id, rutas(numero_ruta, nombre))
      `
      )
      .eq("conductor_id", conductorId)
      .eq("estado", "completado")
      .order("fecha", { ascending: false })
      .limit(5);

    if (errorHistorial) {
      console.warn("Advertencia obteniendo historial:", errorHistorial);
    }

    // ── TRANSFORMAR DATOS ───────────────────────────────────────────

    // Usuarios por parada
    const usuariosPorParada = {};
    (pasajeros ?? []).forEach((ur) => {
      const pid = ur.parada_origen_id;
      usuariosPorParada[pid] = (usuariosPorParada[pid] ?? 0) + 1;
    });

    // Paradas enriquecidas
    const paradas = (paradasRuta ?? []).map((rp) => ({
      id: rp.paradas.id,
      nombre: rp.paradas.nombre,
      latitud: rp.paradas.latitud,
      longitud: rp.paradas.longitud,
      orden: rp.orden,
      eta: rp.tiempo_desde_inicio,
      usuariosSuben: usuariosPorParada[rp.paradas.id] ?? 0,
    }));

    const totalPasajeros = Object.values(usuariosPorParada).reduce(
      (a, b) => a + b,
      0
    );

    // ── CONSTRUIR RESPUESTA ─────────────────────────────────────────
    return {
      success: true,
      data: {
        turno: {
          id: turno.id,
          estado: turno.estado,
          fecha: turno.fecha,
          horaInicioReal: turno.hora_inicio_real,
          horaFinReal: turno.hora_fin_real,
          nombreTurno: horario.nombre_turno,
          horaInicio: horario.hora_inicio,
          horaFin: horario.hora_fin,
        },
        ruta: {
          id: ruta.id,
          numeroRuta: ruta.numero_ruta,
          nombre: ruta.nombre,
          color: ruta.color,
          trayecto: ruta.trayecto,
        },
        vehiculo: vehiculo
          ? {
              id: vehiculo.id,
              placa: vehiculo.placa,
              capacidad: vehiculo.tipo_vehiculo?.capacidad_max ?? 0,
              tipo: vehiculo.tipo_vehiculo?.nombre ?? "Buseta",
            }
          : null,
        ubicacion: ubicacion
          ? {
              latitud: ubicacion.latitud,
              longitud: ubicacion.longitud,
              velocidad: ubicacion.velocidad,
              updated_at: ubicacion.updated_at,
            }
          : null,
        paradas,
        totalPasajeros,
        historial: historial ?? [],
      },
    };
  } catch (error) {
    console.error("Error en getDashboardConductor:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Actualiza el estado del turno actual del conductor
 */
export const actualizarEstadoTurno = async (conductorId, nuevoEstado) => {
  try {
    if (!conductorId) {
      return { success: false, error: "Conductor ID requerido" };
    }

    if (
      !["en_curso", "completado", "cancelado"].includes(nuevoEstado)
    ) {
      return { success: false, error: "Estado inválido" };
    }

    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("turnos")
      .update({
        estado: nuevoEstado,
        hora_fin_real:
          nuevoEstado === "completado" ? new Date().toISOString() : null,
      })
      .eq("conductor_id", conductorId)
      .eq("fecha", hoy)
      .in("estado", ["en_curso", "programado"])
      .select();

    if (error) {
      console.error("Error actualizando estado:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error en actualizarEstadoTurno:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Actualiza la ubicación del conductor en la BD.
 * @param {string} conductorId - UUID del conductor
 * @param {number} latitud - Latitud GPS
 * @param {number} longitud - Longitud GPS
 * @param {number|null} velocidad - Velocidad en km/h (opcional)
 */
export async function actualizarUbicacionConductor(
  conductorId,
  latitud,
  longitud,
  velocidad = null
) {
  try {
    if (!conductorId || latitud == null || longitud == null) {
      return { success: false, error: "Parámetros incompletos" };
    }

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

/**
 * Obtiene el historial de turnos de un conductor
 * @param {string} conductorId - UUID del conductor
 * @param {number} limite - Número de registros a obtener (default: 10)
 */
export const obtenerHistorialTurnos = async (conductorId, limite = 10) => {
  try {
    if (!conductorId) {
      return { success: false, error: "Conductor ID requerido" };
    }

    const { data, error } = await supabase
      .from("turnos")
      .select(
        `
        id,
        fecha,
        estado,
        hora_inicio_real,
        hora_fin_real,
        vehiculos(placa),
        ruta_horarios!inner(ruta_id, rutas(numero_ruta, nombre))
      `
      )
      .eq("conductor_id", conductorId)
      .eq("estado", "completado")
      .order("fecha", { ascending: false })
      .limit(limite);

    if (error) {
      console.error("Error obteniendo historial:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error en obtenerHistorialTurnos:", error.message);
    return { success: false, error: error.message };
  }
};

// ────────────────────────────────────────────────────────────────────────────────
// FUNCIONES UTILIDAD
// ────────────────────────────────────────────────────────────────────────────────

/**
 * Formatea hora en formato 24h a formato 12h
 * "06:00:00" → "6:00 AM"
 */
export function formatearHora(hora) {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const periodo = h >= 12 ? "PM" : "AM";
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${String(m).padStart(2, "0")} ${periodo}`;
}

/**
 * Traduce el nombre del turno del DB al español
 * "manana" → "Mañana"
 */
export const nombreTurno = (nombre) => {
  const map = {
    manana: "Mañana",
    tarde: "Tarde",
    noche: "Noche",
  };
  return map[nombre] || nombre;
};
