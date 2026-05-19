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
export async function getVehiculosDisponibles(hora_inicio, hora_fin, diasSelecionado = {}) {

  if (!hora_inicio || !hora_fin) return [];


  // 1. Traer todos los horarios activos con sus días
  const { data: horarios, error: errorHorarios } = await supabase
    .from('ruta_horarios')
    .select('vehiculo_id, hora_inicio, hora_fin, lunes, martes, miercoles, jueves, viernes, sabado, domingo');

  if (errorHorarios) throw errorHorarios;

  // 2. Detectar vehículos ocupados: solapamiento de hora Y al menos un día en común
  const diasKeys = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];


  const ocupadosIds = new Set(
    (horarios || [])
      .filter(h => {
        // Solapamiento de horario: nueva_inicio < existente_fin && nueva_fin > existente_inicio
        const hayConflictoHora = hora_inicio < h.hora_fin && hora_fin > h.hora_inicio;
        if (!hayConflictoHora) return false;

        // Solapamiento de días: al menos un día en común
        const hayConflictoDia = diasKeys.some(
          dia => diasSelecionado[dia] && h[dia]
        );
        return hayConflictoDia;
      })
      .map(h => h.vehiculo_id)
  );

  // 3. Traer vehículos activos excluyendo los ocupados
  let query = supabase
    .from('vehiculos')
    .select('id, placa, conductor_id, seguro, activo, fecha_vencimiento, tipo_vehiculo_id')
    .eq('activo', true);

  if (ocupadosIds.size > 0) {
    query = query.not('id', 'in', `(${[...ocupadosIds].join(',')})`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

