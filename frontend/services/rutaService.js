import { supabase } from './supabase';

/**
 * Obtener todas las rutas
 */
export async function getRutas() {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .order('numero_ruta', { ascending: true });
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error en getRutas:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener una ruta por ID
 */
export async function getRutaById(id) {
  try {
    const { data, error } = await supabase
      .from('rutas')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error en getRutaById:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtener vehículos disponibles para una fecha y turno específico
 */
export async function getVehiculosDisponibles(fecha, turnoId, rutaIdExcluir = null) {
  try {
    let query = supabase
      .from('ruta_horarios')
      .select('vehiculo_id')
      .eq('fecha', fecha)
      .eq('tipo_turno_id', turnoId);
    
    if (rutaIdExcluir) {
      query = query.neq('ruta_id', rutaIdExcluir);
    }
    
    const { data: vehiculosOcupados, error: errorOcupados } = await query;
    
    if (errorOcupados) throw errorOcupados;
    
    const ocupadosIds = (vehiculosOcupados || []).map(v => v.vehiculo_id);
    
    let vehiculosQuery = supabase
      .from('vehiculos')
      .select(`
        *,
        tipo_vehiculo:tipo_vehiculo_id (nombre)
      `)
      .eq('activo', true);
    
    if (ocupadosIds.length > 0) {
      vehiculosQuery = vehiculosQuery.not('id', 'in', `(${ocupadosIds.join(',')})`);
    }
    
    const { data, error } = await vehiculosQuery;
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error en getVehiculosDisponibles:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Verificar validez de SOAT
 */
export function verificarEstadoVehiculo(vehiculo) {
  const advertencias = [];
  const hoy = new Date();
  
  if (vehiculo.fecha_vencimiento) {
    const fechaVencimiento = new Date(vehiculo.fecha_vencimiento);
    if (fechaVencimiento < hoy) {
      advertencias.push(`⚠️ SOAT vencido desde ${vehiculo.fecha_vencimiento}`);
    } else if (fechaVencimiento < new Date(hoy.setMonth(hoy.getMonth() + 1))) {
      advertencias.push(`⚠️ SOAT vence el ${vehiculo.fecha_vencimiento}`);
    }
  }
  
  return {
    valido: advertencias.length === 0,
    advertencias
  };
}

/**
 * Obtener turnos
 */
export async function getTurnos() {
  try {
    const { data, error } = await supabase
      .from('tipos_turno')
      .select('*')
      .order('id');
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error en getTurnos:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Verificar conflicto de horario
 */
export async function verificarConflictoHorario(vehiculoId, turnoId, fecha, rutaIdExcluir = null) {
  try {
    let query = supabase
      .from('ruta_horarios')
      .select('id, ruta_id')
      .eq('vehiculo_id', vehiculoId)
      .eq('tipo_turno_id', turnoId)
      .eq('fecha', fecha);
    
    if (rutaIdExcluir) {
      query = query.neq('ruta_id', rutaIdExcluir);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    if (data && data.length > 0) {
      const { data: rutaData } = await supabase
        .from('rutas')
        .select('numero_ruta')
        .eq('id', data[0].ruta_id)
        .single();
      
      return { 
        success: true, 
        tieneConflicto: true,
        rutaConflicto: rutaData?.numero_ruta || 'otra ruta'
      };
    }
    
    return { success: true, tieneConflicto: false };
  } catch (error) {
    console.error('Error en verificarConflictoHorario:', error.message);
    return { success: true, tieneConflicto: false };
  }
}

/**
 * Obtener usuarios disponibles
 */
export async function getUsuariosDisponibles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nombre, cedula, rol')
      .eq('rol', 'usuario')
      .eq('activo', true)
      .order('nombre');
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error en getUsuariosDisponibles:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener paradas de una ruta
 */
export async function getParadasByRuta(rutaId) {
  try {
    const { data, error } = await supabase
      .from('ruta_paradas')
      .select('*')
      .eq('ruta_id', rutaId)
      .order('orden', { ascending: true });
    
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error) {
    console.error('Error en getParadasByRuta:', error.message);
    return { success: false, error: error.message, data: [] };
  }
}

/**
 * Obtener asignaciones actuales de una ruta
 */
export async function getAsignacionesRuta(rutaId) {
  try {
    const { data: horarios, error: errorHorarios } = await supabase
      .from('ruta_horarios')
      .select('*')
      .eq('ruta_id', rutaId);
    
    if (errorHorarios) throw errorHorarios;
    
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from('usuario_ruta')
      .select('*')
      .eq('ruta_id', rutaId);
    
    if (errorUsuarios) throw errorUsuarios;
    
    const turnosIds = [...new Set(horarios.map(h => h.tipo_turno_id).filter(Boolean))];
    let turnosMap = new Map();
    if (turnosIds.length > 0) {
      const { data: turnos } = await supabase
        .from('tipos_turno')
        .select('*')
        .in('id', turnosIds);
      turnosMap = new Map((turnos || []).map(t => [t.id, t]));
    }
    
    const vehiculosIds = [...new Set(horarios.map(h => h.vehiculo_id).filter(Boolean))];
    let vehiculosMap = new Map();
    if (vehiculosIds.length > 0) {
      const { data: vehiculos } = await supabase
        .from('vehiculos')
        .select('*')
        .in('id', vehiculosIds);
      vehiculosMap = new Map((vehiculos || []).map(v => [v.id, v]));
    }
    
    const usuariosIds = [...new Set(usuarios.map(u => u.usuario_id).filter(Boolean))];
    let perfilesMap = new Map();
    if (usuariosIds.length > 0) {
      const { data: perfiles } = await supabase
        .from('profiles')
        .select('id, nombre, cedula, rol')
        .in('id', usuariosIds);
      perfilesMap = new Map((perfiles || []).map(p => [p.id, p]));
    }
    
    const horariosConDatos = (horarios || []).map(h => ({
      ...h,
      turno: turnosMap.get(h.tipo_turno_id) || null,
      vehiculo: vehiculosMap.get(h.vehiculo_id) || null
    }));
    
    const usuariosConDatos = (usuarios || []).map(u => ({
      ...u,
      usuario: perfilesMap.get(u.usuario_id) || null
    }));
    
    return {
      success: true,
      data: {
        horarios: horariosConDatos,
        usuarios: usuariosConDatos
      }
    };
  } catch (error) {
    console.error('Error en getAsignacionesRuta:', error.message);
    return { success: false, error: error.message, data: { horarios: [], usuarios: [] } };
  }
}

/**
 * Guardar asignaciones
 */
export async function guardarAsignaciones(rutaId, asignaciones) {
  try {
    const { error: errorHorarios } = await supabase
      .from('ruta_horarios')
      .delete()
      .eq('ruta_id', rutaId);
    
    if (errorHorarios) throw errorHorarios;
    
    const { error: errorUsuarios } = await supabase
      .from('usuario_ruta')
      .delete()
      .eq('ruta_id', rutaId);
    
    if (errorUsuarios) throw errorUsuarios;
    
    if (asignaciones.vehiculosPorTurno && asignaciones.vehiculosPorTurno.length > 0) {
      const turnosIds = [...new Set(asignaciones.vehiculosPorTurno.map(item => parseInt(item.turnoId)))];
      const { data: turnosData } = await supabase
        .from('tipos_turno')
        .select('id, hora_inicio, hora_fin')
        .in('id', turnosIds);
      
      const turnosMap = new Map();
      if (turnosData) {
        turnosData.forEach(t => {
          turnosMap.set(t.id, {
            hora_inicio: t.hora_inicio,
            hora_fin: t.hora_fin
          });
        });
      }
      
      const getEnumValue = (turnoId) => {
        switch(parseInt(turnoId)) {
          case 1: return 'manana';
          case 2: return 'tarde';
          case 3: return 'noche';
          default: return '';
        }
      };
      
      const datosHorarios = asignaciones.vehiculosPorTurno.map(item => {
        const turnoId = parseInt(item.turnoId);
        const turnoInfo = turnosMap.get(turnoId);
        
        return {
          ruta_id: rutaId,
          tipo_turno_id: turnoId,
          vehiculo_id: item.vehiculoId,
          fecha: item.fecha,
          nombre_turno: getEnumValue(item.turnoId),
          hora_inicio: turnoInfo?.hora_inicio || '00:00:00',
          hora_fin: turnoInfo?.hora_fin || '00:00:00'
        };
      });
      
      const { error: errorInsertHorarios } = await supabase
        .from('ruta_horarios')
        .insert(datosHorarios);
      
      if (errorInsertHorarios) throw errorInsertHorarios;
    }
    
    if (asignaciones.usuarios && asignaciones.usuarios.length > 0) {
      const datosUsuarios = asignaciones.usuarios.map(item => ({
        usuario_id: item.usuarioId,
        ruta_id: rutaId,
        parada_origen_id: parseInt(item.paradaOrigenId),
        parada_destino_id: parseInt(item.paradaDestinoId),
        estado: 'asignado'
      }));
      
      const { error: errorInsertUsuarios } = await supabase
        .from('usuario_ruta')
        .insert(datosUsuarios);
      
      if (errorInsertUsuarios) throw errorInsertUsuarios;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error en guardarAsignaciones:', error.message);
    return { success: false, error: error.message };
  }
}