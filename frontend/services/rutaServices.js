import { supabase } from "./supabase";
import { notificarConductorAsignado } from "./notificacionesServices";
//FUncion para guardar la ruta completa 
//Guardamos lo que viene siendo las paradas el trayecto el conductor asignado con el bus 
//
export const guardarRutaCompleta = async (
    nombre,
    numeroRuta,
    puntosRuta,
    conductorId,
    vehiculoId,
    horaInicio,
    horaFin,
    turno_id,
    puntosParada,
    diasTipo
) => {
    let rutaId = null;

    try {
        // Validar duplicado de número de ruta
        const { data: rutaExistente } = await supabase
            .from('rutas')
            .select('id')
            .eq('numero_ruta', parseInt(numeroRuta))
            .maybeSingle();

        if (rutaExistente) {
            throw new Error(`Ya existe una ruta con el número ${numeroRuta}`);
        }

        // Validar conflicto de horario con el mismo vehículo
        const { data: conflicto } = await supabase
            .from('ruta_horarios')
            .select('id')
            .eq('vehiculo_id', vehiculoId)
            .eq('hora_inicio', horaInicio)
            .maybeSingle();

        if (conflicto) {
            throw new Error('Este vehículo ya tiene una ruta asignada en ese horario');
        }

        // 1. Guardar la ruta y obtener el ID (usando RPC)
        const { data, error } = await supabase.rpc('guardar_ruta', {
            p_nombre: nombre,
            p_numero_ruta: parseInt(numeroRuta),
            p_puntos: puntosRuta.map(p => ({ lon: p.lon, lat: p.lat }))
        });
        if (error) throw error;

        rutaId = data?.id ?? data;

        // 2. Calcular días según el tipo seleccionado
        const dias = {
            lunes: diasTipo === 'entre_semana' || diasTipo === 'todos',
            martes: diasTipo === 'entre_semana' || diasTipo === 'todos',
            miercoles: diasTipo === 'entre_semana' || diasTipo === 'todos',
            jueves: diasTipo === 'entre_semana' || diasTipo === 'todos',
            viernes: diasTipo === 'entre_semana' || diasTipo === 'todos',
            sabado: diasTipo === 'fines_semana' || diasTipo === 'todos',
            domingo: diasTipo === 'fines_semana' || diasTipo === 'todos',
        };

        // 3. Obtener el nombre del turno en minúsculas (para el enum)
        let nombreTurno = null;
        if (turno_id) {
            const { data: turnoData, error: turnoError } = await supabase
                .from('tipos_turno')
                .select('nombre')
                .eq('id', turno_id)
                .single();

            if (turnoError) {
                console.warn('No se pudo obtener el nombre del turno:', turnoError);
            } else if (turnoData?.nombre) {
                // Convertir a minúsculas: 'Mañana' -> 'mañana', etc.
                nombreTurno = turnoData.nombre.toLowerCase();
            }
        }

        // 4. Insertar el horario en ruta_horarios
        //    IMPORTANTE: La columna del enum se llama 'turno_nombre' según el error de Supabase.
        //    Si en tu tabla se llama 'nombre_turno', cámbiala aquí.
        const { error: errorHorario } = await supabase
            .from('ruta_horarios')
            .insert({
                ruta_id: parseInt(rutaId),
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                vehiculo_id: vehiculoId,
                tipo_turno_id: turno_id,
                ...dias,
                activo: true
            });

        if (errorHorario) throw errorHorario;

        // 5. Guardar los puntos de la ruta (trayecto) como paradas tipo 'trayecto'
        for (let i = 0; i < puntosRuta.length; i++) {
            const puntoGeo = `POINT(${puntosRuta[i].lon} ${puntosRuta[i].lat})`;
            const { data: parada, error: errorParada } = await supabase
                .from('paradas')
                .insert({
                    nombre: `Parada ${i + 1}`,
                    ubicacion: puntoGeo,
                    activa: true,
                    tipo: 'trayecto'
                })
                .select()
                .single();

            if (errorParada) throw errorParada;

            const { error: errorRutaParada } = await supabase
                .from('ruta_paradas')
                .insert({
                    ruta_id: parseInt(rutaId),
                    parada_id: parada.id,
                    orden: i + 1
                });

            if (errorRutaParada) throw errorRutaParada;
        }

        // 6. Guardar las paradas de bus (tipo 'parada_bus')
        for (let i = 0; i < puntosParada.length; i++) {
            const puntoGeo = `POINT(${puntosParada[i].lon} ${puntosParada[i].lat})`;
            const { data: parada, error: errorParada } = await supabase
                .from('paradas')
                .insert({
                    nombre: `Parada bus ${i + 1}`,
                    ubicacion: puntoGeo,
                    activa: true,
                    tipo: 'parada_bus'
                })
                .select()
                .single();

            if (errorParada) throw errorParada;

            const { error: errorRutaParada } = await supabase
                .from('ruta_paradas')
                .insert({
                    ruta_id: parseInt(rutaId),
                    parada_id: parada.id,
                    orden: puntosRuta.length + i + 1
                });

            if (errorRutaParada) throw errorRutaParada;
        }

        return rutaId;

    } catch (error) {
        // Rollback manual en caso de fallo
        if (rutaId) {
            console.log('🔄 Revirtiendo por error:', error.message);
            await supabase.from('ruta_paradas').delete().eq('ruta_id', rutaId);
            await supabase.from('ruta_horarios').delete().eq('ruta_id', rutaId);
            await supabase.from('rutas').delete().eq('id', rutaId);
        }
        throw error;
    }
};



export async function obtenerRutas() {
    const { data, error } = await supabase
        .from('rutas')
        .select(`
            *,
            ruta_paradas (
                orden,
                paradas (
                    id,
                    nombre,
                    ubicacion,
                    descripcion
                )
            )
        `)
        .order('fecha_registro', { ascending: false });

    if (error) {
        console.log("Error al obtener rutas", error);
        return { data: null, error };
    }

    return { data, error: null };
}

export async function obtenerRutaPorId(id) {
    const { data, error } = await supabase
        .from('rutas')
        .select(`
            *,
            ruta_paradas (
                orden,
                tiempo_desde_inicio,
                paradas (
                    id,
                    nombre,
                    ubicacion,
                    descripcion,
                    activa
                )
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.log("Error al obtener la ruta", error);
        return { data: null, error };
    }

    return { data, error: null };
}


// ============================================================
//           FUNCIONES DE ASIGNACIÓN DE RECURSOS 
// ============================================================

/**
 * Obtener todas las rutas (versión simple)
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
 * Obtener una ruta por ID (versión simple)
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
 * Eliminar asignación de un turno específico
 */
export async function eliminarAsignacionTurno(rutaId, turnoId, fecha) {
    try {
        const { error } = await supabase
            .from('ruta_horarios')
            .delete()
            .eq('ruta_id', rutaId)
            .eq('tipo_turno_id', turnoId)
            .eq('fecha', fecha);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error en eliminarAsignacionTurno:', error.message);
        return { success: false, error: error.message };
    }
}


/**
 * Verificar validez de SOAT, seguro y tecnomecánica
 */
export function verificarEstadoVehiculo(vehiculo) {
    const advertencias = [];
    if (!vehiculo.activo) advertencias.push("Vehículo inactivo");
    if (!vehiculo.seguro) advertencias.push("Sin seguro activo");
    if (!vehiculo.conductor_id) advertencias.push("No tiene conductor asignado");

    if (vehiculo.fecha_vencimiento) {
        const hoy = new Date();
        const fechaSOAT = new Date(vehiculo.fecha_vencimiento);
        if (fechaSOAT < hoy) {
            advertencias.push(" SOAT vencido");
        } else if (fechaSOAT < new Date(hoy.setMonth(hoy.getMonth() + 1))) {
            advertencias.push(" SOAT próximo a vencer");
        }
    } else {
        advertencias.push("No tiene fecha de vencimiento de SOAT registrada");
    }
    return { valido: advertencias.length === 0, advertencias };
}

/**
 * Obtener turnos (tipos_turno)
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
 * Obtener paradas de una ruta (desde ruta_paradas)
 */
export async function getParadasByRuta(rutaId) {
    try {
        // Consulta simple a la tabla paradas
        const { data, error } = await supabase
            .from('paradas')
            .select('id, nombre')
            .eq('activa', true);

        if (error) throw error;

        return { success: true, data: data || [] };
    } catch (error) {
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

        // Obtener los IDs de las paradas de origen y destino
        const todasParadasIds = [...new Set([
            ...usuarios.map(u => u.parada_origen_id),
            ...usuarios.map(u => u.parada_destino_id)
        ].filter(Boolean))];

        // Obtener los nombres de las paradas
        let paradasMap = new Map();
        if (todasParadasIds.length > 0) {
            const { data: paradas } = await supabase
                .from('paradas')
                .select('id, nombre')
                .in('id', todasParadasIds);
            paradasMap = new Map((paradas || []).map(p => [p.id, p.nombre]));
        }

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
                .select('*, tipo_vehiculo:tipo_vehiculo_id(nombre, capacidad_max), conductor:conductor_id(id, nombre)')
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
            usuario: perfilesMap.get(u.usuario_id) || null,
            origen_nombre: paradasMap.get(u.parada_origen_id) || 'Sin nombre',
            destino_nombre: paradasMap.get(u.parada_destino_id) || 'Sin nombre'
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
                switch (parseInt(turnoId)) {
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
                turno_id: item.turnoId,
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
