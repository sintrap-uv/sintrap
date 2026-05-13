import { supabase } from './supabase';

// Obtener conductores disponibles
export async function getAvailableDrivers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre')
    .eq('rol', 'conductor');

  if (error) throw error;
  return data;
}

// Obtener tipos de vehículo
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

// Registrar un nuevo vehículo
// NOTA: no se usa la columna "capacidad" — esa info viene de tipo_vehiculo
export async function registerVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehiculos')
    .insert([
      {
        placa: vehicleData.placa,
        conductor_id: vehicleData.conductor_id,
        seguro: vehicleData.seguro,
        fecha_inicio: vehicleData.fecha_inicio,
        fecha_vencimiento: vehicleData.fecha_vencimiento,
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
    .single();

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

// Obtener vehículos disponibles para una hora de inicio específica
//para que olamente filtre los conductores disponoble 
export async function getVehiculosDisponibles(hora_inicio) {

  if (!hora_inicio) return []

  //1 Primero obtenemos los IDS de vehiculos ocupados a esa hora 
  const {data:ocupados, error : errorOcupados} = await supabase
  .from('ruta_horarios')
  .select('vehiculo_id')
  .eq('hora_inicio', hora_inicio)

  if(errorOcupados) throw errorOcupados;

    const ocupadosIds = (ocupados || []).map(item => item.vehiculo_id);

    // 2. Consultar vehículos activos excluyendo los ocupados
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
}

// Obtener conductores disponibles (que tengan vehículo disponible a esa hora)
export async function getConductoresDisponibles(horaInicio) {
    const vehiculosDisponibles = await getVehiculosDisponibles(horaInicio);
    const conductoresIds = vehiculosDisponibles.map(v => v.conductor_id).filter(id => id != null);

    if (conductoresIds.length === 0) return [];

    const { data, error } = await supabase
        .from('profiles')
        .select('id, nombre')
        .eq('rol', 'conductor')
        .in('id', conductoresIds);

    if (error) throw error;
    return data || [];
}