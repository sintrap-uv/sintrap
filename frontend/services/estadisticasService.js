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

// OCUPACIÓN DE VEHÍCULOS

export const getOcupacionVehiculos = async (fechaInicio, fechaFin) => {
  try {
    // Consulta directa sin RPC
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        id,
        placa,
        tipo_vehiculo:tipo_vehiculo_id (
          nombre,
          capacidad_max
        ),
        turnos (
          id,
          estado,
          fecha
        )
      `)
      .eq('activo', true);

    if (error) throw error;

    // Transformar datos al formato para la gráfica
    const resultado = data.map(vehiculo => {
      const turnos = vehiculo.turnos.filter(t => {
        const fecha = new Date(t.fecha);
        const inicio = new Date(fechaInicio);
        const fin = new Date(fechaFin);
        return fecha >= inicio && fecha <= fin;
      });

      // Contar usuarios en turnos activos
      const usuariosPromise = turnos
        .filter(t => ['en_curso', 'programado'].includes(t.estado))
        .reduce((acc, turno) => acc + (turno.usuarios_count || 0), 0);

      const capacidad = vehiculo.tipo_vehiculo?.capacidad_max || 1;
      const ocupados = usuariosPromise;
      const porcentaje = Math.round((ocupados / capacidad) * 100);

      return {
        placa: vehiculo.placa,
        capacidad,
        ocupados,
        porcentaje_ocupacion: porcentaje,
      };
    });

    return resultado.sort((a, b) => b.porcentaje_ocupacion - a.porcentaje_ocupacion);
  } catch (error) {
    console.error('Error getOcupacionVehiculos:', error);
    return [];
  }
};

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

// REPORTES POR TIPO

export const getReportesPorTipo = async (fechaInicio, fechaFin, estadoFiltro = null) => {
  try {
    let query = supabase
      .from('reportes')
      .select('tipo')
      .gte('fecha', `${fechaInicio}T00:00:00`)
      .lte('fecha', `${fechaFin}T23:59:59`);

    if (estadoFiltro) {
      query = query.eq('estado', estadoFiltro);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Agrupar por tipo
    const resumen = {};
    data.forEach(reporte => {
      resumen[reporte.tipo] = (resumen[reporte.tipo] || 0) + 1;
    });

    return Object.entries(resumen)
      .map(([tipo, cantidad]) => ({ tipo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  } catch (error) {
    console.error('Error getReportesPorTipo:', error);
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

// OCUPACIÓN DE RUTAS

export const getOcupacionRutas = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .select(`
        id,
        numero_ruta,
        nombre,
        vehiculos:vehiculos (
          id,
          tipo_vehiculo:tipo_vehiculo_id (
            capacidad_max
          ),
          turnos (
            id,
            estado,
            fecha
          )
        ),
        usuario_ruta (
          id
        )
      `)
      .eq('activa', true);

    if (error) throw error;

    return data.map(ruta => {
      // Filtrar vehículos por período
      const vehiculosPeriodo = ruta.vehiculos.filter(v => {
        const turno = v.turnos.find(t => {
          const fecha = new Date(t.fecha);
          const inicio = new Date(fechaInicio);
          const fin = new Date(fechaFin);
          return fecha >= inicio && fecha <= fin;
        });
        return turno;
      });

      // Sumar capacidades
      const capacidadTotal = vehiculosPeriodo.reduce(
        (sum, v) => sum + (v.tipo_vehiculo?.capacidad_max || 0),
        0
      ) || 1;

      const usuariosAsignados = ruta.usuario_ruta.length;
      const porcentaje = Math.round((usuariosAsignados / capacidadTotal) * 100);

      return {
        numero_ruta: ruta.numero_ruta.toString(),
        nombre: ruta.nombre,
        capacidad_total: capacidadTotal,
        usuarios_asignados: usuariosAsignados,
        porcentaje,
      };
    }).sort((a, b) => b.porcentaje - a.porcentaje);
  } catch (error) {
    console.error('Error getOcupacionRutas:', error);
    return [];
  }
};

// TENDENCIA DE REPORTES

export const getTendenciaReportes = async (fechaInicio, fechaFin) => {
  try {
    const { data, error } = await supabase
      .from('reportes')
      .select('tipo, fecha')
      .gte('fecha', `${fechaInicio}T00:00:00`)
      .lte('fecha', `${fechaFin}T23:59:59`);

    if (error) throw error;

    // Agrupar por día y tipo
    const porDia = {};
    data.forEach(reporte => {
      const dia = reporte.fecha.split('T')[0];
      if (!porDia[dia]) porDia[dia] = {};
      if (!porDia[dia][reporte.tipo]) porDia[dia][reporte.tipo] = 0;
      porDia[dia][reporte.tipo] += 1;
    });

    // Convertir a array
    const resultado = [];
    Object.entries(porDia).forEach(([dia, tipos]) => {
      Object.entries(tipos).forEach(([tipo, cantidad]) => {
        resultado.push({ dia, tipo, cantidad });
      });
    });

    return resultado.sort((a, b) => new Date(a.dia) - new Date(b.dia));
  } catch (error) {
    console.error('Error getTendenciaReportes:', error);
    return [];
  }
};

// ESTADO DE VEHÍCULOS

export const getEstadoVehiculos = async (fechaInicio, fechaFin) => {
  try {
    const hoy = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        id,
        placa,
        activo,
        tipo_vehiculo:tipo_vehiculo_id (
          nombre
        ),
        conductor:conductor_id (
          nombre
        ),
        ruta:ruta_id (
          numero_ruta
        ),
        turnos (
          id,
          estado,
          fecha
        )
      `)
      .eq('activo', true);

    if (error) throw error;

    // Clasificar estado
    const clasificar = (vehiculo) => {
      const turnoHoy = vehiculo.turnos.find(t => t.fecha === hoy && t.estado === 'en_curso');
      if (turnoHoy) return 'Activo en ruta';
      if (vehiculo.turnos.length === 0) return 'Disponible';
      return 'Inactivo';
    };

    // Agrupar por estado
    const resumen = {};
    data.forEach(vehiculo => {
      const estado = clasificar(vehiculo);
      resumen[estado] = (resumen[estado] || 0) + 1;
    });

    return {
      resumen: Object.entries(resumen).map(([estado, cantidad]) => ({
        estado_vehiculo: estado,
        cantidad,
      })),
      detalles: data.map(v => ({
        placa: v.placa,
        tipo: v.tipo_vehiculo?.nombre || 'N/A',
        estado: clasificar(v),
        conductor: v.conductor?.nombre || 'No asignado',
        ruta: v.ruta?.numero_ruta?.toString() || 'N/A',
        ultima_ubicacion: 'GPS',
        vencimiento: 'N/A',
      })),
    };
  } catch (error) {
    console.error('Error getEstadoVehiculos:', error);
    return { resumen: [], detalles: [] };
  }
};
