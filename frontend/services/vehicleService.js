import { supabase } from './supabase';

// Obtener conductores disponibles
export async function getAvailableDrivers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre')
    .eq('rol', 'conductor');

    console.log('conductores:' ,JSON.stringify(data));
    console.log('error:' ,JSON.stringify(error));



  if (error) throw error;
  return data;
}

// Registrar un nuevo vehículo
export async function registerVehicle(vehicleData) {
  const { data, error } = await supabase
    .from('vehiculos')
    .insert([
      {
        placa:        vehicleData.placa,
        seguro:       vehicleData.seguro,
        conductor_id: vehicleData.conductor_id,
        activo:       true,
      },
    ]);

  if (error) throw error;
  return data;
}