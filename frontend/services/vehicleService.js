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
    .select('id, nombre, descripcion')
    .order('nombre', { ascending: true });

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
        placa:             vehicleData.placa,
        conductor_id:      vehicleData.conductor_id,
        seguro:            vehicleData.seguro,
        fecha_inicio:      vehicleData.fecha_inicio,
        fecha_vencimiento: vehicleData.fecha_vencimiento,
        tipo_vehiculo_id:  vehicleData.tipo_vehiculo_id,
      },
    ]);

  if (error) throw error;
  return data;
}