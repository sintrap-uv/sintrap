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
    
    const turnos = Array.isArray(data) ? data.map(turno => ({
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
    })) : [];
    
    return { success: true, data: turnos };
  } catch (err) {
    console.error("Catch Error:", err);
    return { success: false, error: err.message };
  }
}


/**
 * Carga todos los datos del dashboard del conductor en paralelo.
 * @param {string} conductorId - UUID del conductor autenticado
 * Obtiene el dashboard del conductor con su turno actual, ruta y paradas
 * 
 * Error anterior: "JSON object requested, multiple (or no) rows returned"
 * Causa: El conductor podía tener múltiples turnos (programado, en curso, etc)
 * Solución: Filtrar por fecha = hoy y estado en ['en_curso', 'programado']
 */
export const getDashboardConductor = async (conductorId) => {
  try {
    if (!conductorId) return { success: false, error: "Conductor ID requerido" };

    // Fecha local Colombia (evita bug UTC que adelanta un día)
    const hoy = new Date().toLocaleDateString("en-CA");

    // ── Turno de hoy ────────────────────────────────────────────────
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
      `,
      )
      .eq("conductor_id", conductorId)
      .eq("fecha", hoy)
      .in("estado", ["en_curso", "programado"])
      .order("estado", { ascending: false }) // en_curso primero
      .limit(1);

    if (errorTurnos) {
      console.error("Error obteniendo turnos:", errorTurnos);
      return { success: false, error: errorTurnos.message };
    }

    // Si no hay turno hoy, retornar null (sin ruta asignada)
    if (!turnos || turnos.length === 0) {
      return { success: true, data: null };
    }

    const turno = turnos[0];

    // Obtener información del vehículo
    const { data: vehiculo, error: errorVehiculo } = await supabase
      .from("vehiculos")
      .select("id, placa, conductor_id, tipo_vehiculo_id")
      .eq("id", turno.vehiculo_id)
      .single();

    if (errorVehiculo) {
      console.error("Error obteniendo vehículo:", errorVehiculo);
      // No es fatal, continuar sin vehículo
    }

    // Obtener horario de la ruta para hoy
    // ruta_horarios vincula turnos con rutas
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
        rutas(id, numero_ruta, nombre, color)
      `,
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
    if (!ruta) {
      return { success: true, data: null };
    }

    // Obtener paradas de la ruta
    const { data: paradasRuta, error: errorParadas } = await supabase
      .from("ruta_paradas")
      .select(
        `
        id,
        parada_id,
        orden,
        tiempo_desde_inicio,
        paradas(id, nombre, latitud, longitud, descripcion)
      `,
      )
      .eq("ruta_id", ruta.id)
      .order("orden", { ascending: true });

    if (errorParadas) {
      console.error("Error obteniendo paradas:", errorParadas);
    }

    // Obtener ubicación actual del conductor
    const { data: ubicacion, error: errorUbicacion } = await supabase
      .from("ubicacion_conductor")
      .select("latitud, longitud, velocidad, updated_at")
      .eq("conductor_id", conductorId)
      .single();

    if (errorUbicacion && errorUbicacion.code !== "PGRST116") {
      // PGRST116 = no rows, es normal si es la primera vez
      console.warn("Advertencia obteniendo ubicación:", errorUbicacion);
    }

    // Obtener capacidad del tipo de vehículo
    let capacidadMax = 0;
    if (vehiculo?.tipo_vehiculo_id) {
      const { data: tipoVeh, error: errTipo } = await supabase
        .from("tipo_vehiculo")
        .select("capacidad_max")
        .eq("id", vehiculo.tipo_vehiculo_id)
        .single();

      if (!errTipo && tipoVeh) {
        capacidadMax = tipoVeh.capacidad_max;
      }
    }

    // Obtener historial de turnos completados
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
        ruta_horarios!inner(ruta_id, rutas(numero_ruta))
      `,
      )
      .eq("conductor_id", conductorId)
      .eq("estado", "completado")
      .order("fecha", { ascending: false })
      .limit(5);

    if (errorHistorial) {
      console.warn("Advertencia obteniendo historial:", errorHistorial);
    }

    // Construir respuesta
    return {
      success: true,
      data: {
        turno: {
          id: turno.id,
          estado: turno.estado,
          fecha: turno.fecha,
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
};

/**
 * Actualiza el estado del turno actual del conductor
 */
export const actualizarEstadoTurno = async (conductorId, nuevoEstado) => {
  try {
    if (!conductorId) {
      return { success: false, error: "Conductor ID requerido" };
    }

    if (!["en_curso", "completado", "cancelado"].includes(nuevoEstado)) {
      return { success: false, error: "Estado inválido" };
    }

    const hoy = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("turnos")
      .update({
        estado: nuevoEstado,
        hora_fin_real: nuevoEstado === "completado" ? new Date().toISOString() : null,
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

/**
 * Traduce el nombre del turno
 */
export const nombreTurno = (nombre) => {
  const map = {
    manana: "Mañana",
    tarde: "Tarde",
    noche: "Noche",
  };
  return map[nombre] || nombre;
};

/**
 * Actualiza la ubicación actual del conductor
 */
export const actualizarUbicacionConductor = async (
  conductorId,
  latitud,
  longitud,
  velocidad = null
) => {
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

    if (error) {
      console.error("Error actualizando ubicación:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Error en actualizarUbicacionConductor:", error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene el historial de turnos de un conductor
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
      `,
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
