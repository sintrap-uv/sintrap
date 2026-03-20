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
        capacidad:       vehicleData.capacidad,
        conductor_id: vehicleData.conductor_id,
        seguro:       vehicleData.seguro,
        fecha_inicio: vehicleData.fecha_inicio,
        fecha_vencimiento: vehicleData.fecha_vencimiento,
      },
    ]);
    

  if (error) throw error;
  return data;
  
}
