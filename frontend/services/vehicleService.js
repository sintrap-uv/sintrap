import { supabase } from './supabase';

export async function getAvailableDrivers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre')
    .eq('rol', 'conductor');

  if (error) throw error;
  return data;
}

export async function getTiposVehiculo() {
  const { data, error } = await supabase
    .from('tipo_vehiculo')
    .select('id, nombre, descripcion, capacidad_max')
    .order('nombre', { ascending: true });

  if (error) throw error;
  return data;
}

export async function obtenerVehiculos() {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('id, placa, conductor_id, seguro, activo, fecha_vencimiento, fecha_inicio, tipo_vehiculo_id')
    .eq('activo', true)
    .order('placa', { ascending: true });

  if (error) throw error;
  return data;
}

export async function registerVehicle(vehicleData) {
  const fechaInicio = vehicleData.seguro ? vehicleData.fecha_inicio : null;
  const fechaVencimiento = vehicleData.seguro ? vehicleData.fecha_vencimiento : null;

  const { data, error } = await supabase
    .from('vehiculos')
    .insert([
      {
        placa: vehicleData.placa,
        conductor_id: vehicleData.conductor_id,
        seguro: vehicleData.seguro,
        fecha_inicio: fechaInicio,
        fecha_vencimiento: fechaVencimiento,
        tipo_vehiculo_id: vehicleData.tipo_vehiculo_id,
      },
    ]);

  if (error) throw error;
  return data;
}

export async function getVehiculoPorConductor(conductorId) {
  const { data, error } = await supabase
    .from('vehiculos')
    .select('id, placa, conductor_id')
    .eq('conductor_id', conductorId)
    .eq('activo', true)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function verificarConflictoHorarioVehiculo(vehiculoId, horaInicio) {
  if (!vehiculoId || !horaInicio) return false;
  const { data, error } = await supabase
    .from('ruta_horarios')
    .select('id')
    .eq('vehiculo_id', vehiculoId)
    .eq('hora_inicio', horaInicio)
    .maybeSingle();
  if (error) {
    console.error('Error verificando conflicto horario:', error);
    return false;
  }
  return !!data;
}

export async function getVehiculosDisponibles(horaInicio, horaFin, diasSemana) {
  if (!horaInicio) return [];

  try {
    const { data: ocupados, error: errorOcupados } = await supabase
      .from('ruta_horarios')
      .select('vehiculo_id')
      .eq('hora_inicio', horaInicio);

    if (errorOcupados) throw errorOcupados;

    const ocupadosIds = (ocupados || []).map(item => item.vehiculo_id);

    let query = supabase
      .from('vehiculos')
      .select('id, placa, conductor_id, seguro, activo, fecha_vencimiento, tipo_vehiculo_id')
      .eq('activo', true);

    if (ocupadosIds.length > 0) {
      query = query.not('id', 'in', `(${ocupadosIds.join(',')})`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en getVehiculosDisponibles:', error);
    return [];
  }
}

export async function getConductoresDisponibles(horaInicio, horaFin, diasSemana) {
  try {
    const vehiculosDisponibles = await getVehiculosDisponibles(horaInicio, horaFin, diasSemana);
    const conductoresIds = vehiculosDisponibles.map(v => v.conductor_id).filter(id => id != null);

    if (conductoresIds.length === 0) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre')
      .eq('rol', 'conductor')
      .in('id', conductoresIds);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error en getConductoresDisponibles:', error);
    return [];
  }
}

export async function verificarDependenciasVehiculo(vehiculoId) {
  try {
    const { data, error } = await supabase.rpc('fn_verificar_dependencias_vehiculo', {
      p_vehiculo_id: vehiculoId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error verificando dependencias del vehículo:', error);
    throw error;
  }
}

export async function buscarVehiculosReemplazo(horaInicio, horaFin, capacidadMin, diasSemana) {
  try {
    const { data, error } = await supabase.rpc('fn_buscar_vehiculos_reemplazo', {
      p_hora_inicio: horaInicio,
      p_hora_fin: horaFin,
      p_capacidad_min: capacidadMin,
      p_dias_semana: diasSemana
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error buscando vehículos de reemplazo:', error);
    throw error;
  }
}

export async function reasignarVehiculoEnHorarios(horarioIds, nuevoVehiculoId) {
  try {
    const { data, error } = await supabase.rpc('fn_reasignar_vehiculo_en_horarios', {
      p_horario_ids: horarioIds,
      p_nuevo_vehiculo_id: nuevoVehiculoId
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error reasignando vehículo en horarios:', error);
    throw error;
  }
}

export async function notificarCambioVehiculo(rutaIds, placaAnterior, placaNueva = null, tipoCambio = 'cambio_vehiculo') {
  try {
    const { data, error } = await supabase.rpc('fn_notificar_cambio_vehiculo', {
      p_ruta_ids: rutaIds,
      p_placa_anterior: placaAnterior,
      p_placa_nueva: placaNueva,
      p_tipo_cambio: tipoCambio
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error notificando cambio de vehículo:', error);
    throw error;
  }
}

export async function desactivarRutaCompleta(rutaId, motivo, placaVehiculo = null) {
  try {
    const { data, error } = await supabase.rpc('fn_desactivar_ruta_completa', {
      p_ruta_id: rutaId,
      p_motivo: motivo,
      p_placa_vehiculo: placaVehiculo
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error desactivando ruta completa:', error);
    throw error;
  }
}

export async function desactivarVehiculo(vehiculoId) {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', vehiculoId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error desactivando vehículo:', error);
    throw error;
  }
}

export async function obtenerVehiculoCompleto(vehiculoId) {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .select(`
        id,
        placa,
        conductor_id,
        seguro,
        activo,
        fecha_vencimiento,
        fecha_inicio,
        tipo_vehiculo_id,
        tipo_vehiculo:tipo_vehiculo_id (
          id,
          nombre,
          capacidad_max
        )
      `)
      .eq('id', vehiculoId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo vehículo completo:', error);
    throw error;
  }
}