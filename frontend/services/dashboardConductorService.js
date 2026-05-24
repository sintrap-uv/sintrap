import { supabase } from "./supabase";

/**
 * Obtiene el dashboard del conductor con su turno actual, ruta y paradas
 * 
 * Error anterior: "JSON object requested, multiple (or no) rows returned"
 * Causa: El conductor podía tener múltiples turnos (programado, en curso, etc)
 * Solución: Filtrar por fecha = hoy y estado en ['en_curso', 'programado']
 */
export const getDashboardConductor = async (conductorId) => {
  try {
    if (!conductorId) {
      return { success: false, error: "Conductor ID requerido" };
    }

    // Obtener turno actual (hoy) del conductor
    // Priorizar: en_curso > programado
    const hoy = new Date().toISOString().split("T")[0];

    const { data: turnos, error: errorTurnos } = await supabase
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
          horaFinReal: turno.hora_fin_real,
        },
        ruta: {
          id: ruta.id,
          numeroRuta: ruta.numero_ruta,
          nombre: ruta.nombre,
          color: ruta.color,
        },
        horario: {
          nombreTurno: horario.nombre_turno,
          horaInicio: horario.hora_inicio,
          horaFin: horario.hora_fin,
        },
        vehiculo: vehiculo
          ? {
              id: vehiculo.id,
              placa: vehiculo.placa,
              conductorId: vehiculo.conductor_id,
              capacidadMax: capacidadMax,
            }
          : null,
        paradas: (paradasRuta || []).map((p) => ({
          id: p.id,
          paradaId: p.parada_id,
          orden: p.orden,
          nombre: p.paradas?.nombre || "",
          latitud: p.paradas?.latitud,
          longitud: p.paradas?.longitud,
          descripcion: p.paradas?.descripcion,
          tiempoDesdeInicio: p.tiempo_desde_inicio,
          eta: p.tiempo_desde_inicio,
          usuariosSuben: 0, // Placeholder - calcular si es necesario
        })),
        ubicacionActual: ubicacion
          ? {
              latitud: ubicacion.latitud,
              longitud: ubicacion.longitud,
              velocidad: ubicacion.velocidad,
              actualizado: ubicacion.updated_at,
            }
          : null,
        ocupacion: {
          actual: 0, // Placeholder
          maximo: capacidadMax,
          porcentaje: 0,
        },
        historial: (historial || []).map((h) => {
          // Obtener numero de ruta del historial
          let numeroRuta = "-";
          if (h.ruta_horarios && h.ruta_horarios.length > 0) {
            const rh = h.ruta_horarios[0];
            if (rh.rutas) {
              numeroRuta = rh.rutas.numero_ruta || "-";
            }
          }

          return {
            id: h.id,
            fecha: h.fecha,
            estado: h.estado,
            numeroRuta: numeroRuta,
            placa: h.vehiculos?.placa || "-",
            horaInicioReal: h.hora_inicio_real,
            horaFinReal: h.hora_fin_real,
            nombreTurno: "Completado",
          };
        }),
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
 * Formatea hora en formato HH:MM
 */
export const formatearHora = (hora) => {
  if (!hora) return "--:--";
  try {
    const date = new Date(hora);
    return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "--:--";
  }
};

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
