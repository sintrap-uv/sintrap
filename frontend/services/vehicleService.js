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

export async function getVehiculosDisponibles(hora_inicio) {
  if (!hora_inicio) return [];

  const { data: ocupados, error: errorOcupados } = await supabase
    .from('ruta_horarios')
    .select('vehiculo_id')
    .eq('hora_inicio', hora_inicio);

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
}

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

/**
 * Verifica si un vehículo tiene dependencias (rutas/horarios activos)
 * Llamar ANTES de intentar desactivar un vehículo
 * 
 * @param {number} vehiculoId - ID del vehículo a verificar
 * @returns {Promise<Object>} - Objeto con información de dependencias
 * 
 * Ejemplo de retorno:
 * {
 *   tiene_dependencias: true,
 *   horarios_activos: 2,
 *   rutas: [{ruta_id: 1, numero_ruta: 1, nombre: "Ruta Centro", ...}],
 *   usuarios_afectados: 15
 * }
 */
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

/**
 * Busca vehículos disponibles para reemplazar uno que se desactivará
 * Validación cruzada: horario + días + capacidad + SOAT vigente
 * 
 * @param {string} horaInicio - Hora inicio formato "HH:MM:SS"
 * @param {string} horaFin - Hora fin formato "HH:MM:SS"
 * @param {number} capacidadMin - Capacidad mínima requerida
 * @param {Object} diasSemana - Objeto con días: {lunes: true, martes: true, ...}
 * @returns {Promise<Array>} - Array de vehículos disponibles ordenados por capacidad óptima
 * 
 * Ejemplo de retorno:
 * [
 *   {
 *     vehiculo_id: 46,
 *     placa: "KYT66L",
 *     conductor_id: "uuid...",
 *     conductor_nombre: "Juan Pérez",
 *     tipo_vehiculo: "buseta",
 *     capacidad_max: 20,
 *     fecha_vencimiento_soat: "2027-05-03",
 *     dias_restantes_soat: 365,
 *     tiene_conductor: true
 *   }
 * ]
 */
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

/**
 * Reasigna un vehículo de reemplazo en múltiples horarios
 * Llamar después de que el admin confirma el vehículo de reemplazo
 * 
 * @param {Array<number>} horarioIds - Array de IDs de ruta_horarios a actualizar
 * @param {number} nuevoVehiculoId - ID del vehículo que reemplazará al anterior
 * @returns {Promise<Object>} - Resultado de la operación
 * 
 * Ejemplo de retorno:
 * {
 *   success: true,
 *   updated_count: 3,
 *   horario_ids: [1, 2, 3],
 *   nuevo_vehiculo_id: 46,
 *   rutas_afectadas: [1, 2]
 * }
 */
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

/**
 * Notifica a usuarios afectados por cambio de vehículo
 * Crea notificaciones en tabla 'notificaciones' para todos los usuarios de las rutas
 * 
 * @param {Array<number>} rutaIds - Array de IDs de rutas afectadas
 * @param {string} placaAnterior - Placa del vehículo que se reemplazó
 * @param {string} placaNueva - Placa del nuevo vehículo (opcional)
 * @param {string} tipoCambio - 'cambio_vehiculo' | 'ruta_suspendida'
 * @returns {Promise<Object>} - Resultado con cantidad de notificaciones creadas
 * 
 * Ejemplo de retorno:
 * {
 *   success: true,
 *   notificaciones_creadas: 15,
 *   usuarios_notificados: 15,
 *   tipo_notificacion: 'cambio_ruta'
 * }
 */
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

/**
 * Desactiva una ruta completa cuando no hay vehículo de reemplazo
 * Marca rutas.activa = false y ruta_horarios.activo = false
 * Notifica automáticamente a usuarios afectados
 * 
 * @param {number} rutaId - ID de la ruta a desactivar
 * @param {string} motivo - Motivo de la desactivación
 * @param {string} placaVehiculo - Placa del vehículo (opcional)
 * @returns {Promise<Object>} - Resultado de la operación
 * 
 * Ejemplo de retorno:
 * {
 *   success: true,
 *   ruta_id: 1,
 *   horarios_desactivados: 3,
 *   usuarios_afectados: 15,
 *   motivo: "Vehículo fuera de servicio sin reemplazo disponible",
 *   notificaciones: { ... }
 * }
 */
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

/**
 * Desactiva un vehículo (actualiza activo = false)
 * NOTA: El trigger fn_validar_soat_vehiculo NO bloquea la desactivación
 * Esta función debe llamarse DESPUÉS de verificar dependencias y gestionar reemplazo
 * 
 * @param {number} vehiculoId - ID del vehículo a desactivar
 * @returns {Promise<Object>} - Resultado de la operación
 */
export async function desactivarVehiculo(vehiculoId) {
  try {
    const { data, error } = await supabase
      .from('vehiculos')
      .update({ activo: false })
      .eq('id', vehiculoId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error desactivando vehículo:', error);
    throw error;
  }
}

/**
 * Obtener información completa de un vehículo incluyendo tipo
 * Útil para obtener la placa y capacidad antes de buscar reemplazo
 * 
 * @param {number} vehiculoId - ID del vehículo
 * @returns {Promise<Object>} - Datos completos del vehículo
 */
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
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error obteniendo vehículo completo:', error);
    throw error;
  }
}
