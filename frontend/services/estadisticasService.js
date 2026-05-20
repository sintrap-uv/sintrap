import { supabase } from './supabase';

// FUNCIONES AUXILIARES

export const obtenerRangoFechas = (periodo) => {

  const hoy = new Date();
  let inicio, fin = hoy;

  switch (periodo) {
    case 'hoy':
      inicio = new Date(hoy);
      break;
    case 'semana':
      inicio = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'mes':
      inicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      inicio = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    inicio: inicio.toISOString().split('T')[0],
    fin: fin.toISOString().split('T')[0],
  };
};


/**
 * Obtiene ocupación de rutas activas con usuarios asignados
 */
export async function getOcupacionRutas() {
  try {
    const { data, error } = await supabase.rpc('get_ocupacion_rutas');
    
    if (error) throw error;
    
    return {
      success: true,
      data: data.map(r => ({
        ruta_id: r.ruta_id,
        numero_ruta: r.numero_ruta,
        nombre: r.nombre.trim(),
        usuarios_asignados: r.usuarios_asignados,
        capacidad_total: r.capacidad_total,
        porcentaje: r.porcentaje
      }))
    };
  } catch (error) {
    console.error('Error en getOcupacionRutas:', error.message);
    return { success: false, data: [], error: error.message };
  }
}


// CONDUCTORES ACTIVOS

export const getConductoresActivos = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select('conductor_id')
      .eq('estado', 'en_curso')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) throw error;

    // Contar conductores distintos
    const unicos = new Set(data.map(t => t.conductor_id));
    return unicos.size;
  } catch (error) {
    console.error('Error getConductoresActivos:', error);
    return 0;
  }
};

export const getConductoresActivosTendencia = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select('conductor_id, fecha')
      .in('estado', ['en_curso', 'completado'])
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) throw error;

    // Agrupar por día
    const porDia = {};
    data.forEach(turno => {
      const dia = turno.fecha;
      if (!porDia[dia]) porDia[dia] = new Set();
      porDia[dia].add(turno.conductor_id);
    });

    // Convertir a array para gráfica
    return Object.entries(porDia).map(([dia, conductores]) => ({
      dia,
      conductores_activos: conductores.size,
    }));
  } catch (error) {
    console.error('Error getConductoresActivosTendencia:', error);
    return [];
  }
};

// RUTAS COMPLETADAS VS CANCELADAS

export const getRutasCompletadosCancelados = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select('estado')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) throw error;

    // Agrupar por estado
    const resumen = {
      completado: 0,
      cancelado: 0,
      en_curso: 0,
      programado: 0,
    };

    data.forEach(turno => {
      resumen[turno.estado] = (resumen[turno.estado] || 0) + 1;
    });

    return Object.entries(resumen).map(([estado, cantidad]) => ({
      estado,
      cantidad,
    }));
  } catch (error) {
    console.error('Error getRutasCompletadosCancelados:', error);
    return [];
  }
};
// DISTRIBUCIÓN DE TURNOS

export const getDistribucionTurnos = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('turnos')
      .select('estado')
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin);

    if (error) throw error;

    // Agrupar por estado
    const resumen = {
      programado: { cantidad: 0, color: '#3b82f6' },
      en_curso: { cantidad: 0, color: '#10b981' },
      completado: { cantidad: 0, color: '#9ca3af' },
      cancelado: { cantidad: 0, color: '#ef4444' },
    };

    data.forEach(turno => {
      if (resumen[turno.estado]) {
        resumen[turno.estado].cantidad += 1;
      }
    });

    return Object.entries(resumen).map(([estado, { cantidad, color }]) => ({
      estado,
      cantidad,
      color,
    }));
  } catch (error) {
    console.error('Error getDistribucionTurnos:', error);
    return [];
  }
};

/**
 * Obtiene ocupación de vehículos activos con usuarios asignados
 */
export async function getOcupacionVehiculos() {
  try {
    const { data, error } = await supabase.rpc('get_ocupacion_vehiculos');
    
    if (error) throw error;
    
    return {
      success: true,
      data: data.map(v => ({
        placa: v.placa,
        capacidad: v.capacidad_max,
        ocupados: v.usuarios_asignados,
        porcentaje_ocupacion: Math.round((v.usuarios_asignados / v.capacidad_max) * 100)
      }))
    };
  } catch (error) {
    console.error('Error en getOcupacionVehiculos:', error.message);
    return { success: false, data: [], error: error.message };
  }
}

/**
 * Obtiene tendencia de conductores activos últimos 7 días
 */
export async function getTendenciaConductores() {
  try {
    const { data, error } = await supabase.rpc('get_tendencia_conductores');
    
    if (error) throw error;
    
    const hoy = new Date().toISOString().split('T')[0];
    const activosHoy = data.find(d => d.dia === hoy)?.conductores_activos || 0;
    
    return {
      success: true,
      data: {
        activos: activosHoy,
        tendencia: data
      }
    };
  } catch (error) {
    console.error('Error en getTendenciaConductores:', error.message);
    return { 
      success: false, 
      data: { activos: 0, tendencia: [] },
      error: error.message 
    };
  }
}

/**
 * Obtiene estado de vehículos (resumen + detalles)
 */
export async function getEstadoVehiculos() {
  try {
    const { data, error } = await supabase.rpc('get_estado_vehiculos');
    
    if (error) throw error;
    
    // La función retorna una sola fila con resumen y detalles en JSONB
    const resultado = data[0];
    
    return {
      success: true,
      data: {
        resumen: resultado.resumen || [],
        detalles: resultado.detalles || []
      }
    };
  } catch (error) {
    console.error('Error en getEstadoVehiculos:', error.message);
    return { 
      success: false, 
      data: { resumen: [], detalles: [] },
      error: error.message 
    };
  }
}
