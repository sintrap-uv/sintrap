 import { supabase } from "./supabase"

// Obtener notificaciones de un usuario
export const getNotificaciones = async (usuarioId) => {
  const { data, error } = await supabase
    .from("notificaciones")
    .select("*")
    .eq("usuario_id", usuarioId)
    .order("fecha", { ascending: false })
    .limit(50)

  return { data, error }
}

// Marcar una notificación como leída
export const marcarNotificacionLeida = async (id) => {
  const { data, error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", id)

  return { data, error }
}

// Marcar todas las notificaciones de un usuario como leídas
export const marcarTodasLeidas = async (usuarioId) => {
  const { data, error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("usuario_id", usuarioId)
    .eq("leida", false)

  return { data, error }
}

// Insertar notificación de retraso para una lista de usuarios
export const insertarNotificacionRetraso = async ({
  usuarioIds,
  nombreRuta,
  minutosRetraso,
  vehiculoId,
  rutaId,
}) => {
  const notificaciones = usuarioIds.map((uid) => ({
    usuario_id: uid,
    tipo: "retraso_bus",
    titulo: "Retraso en ruta",
    mensaje: `El bus de ${nombreRuta} lleva aproximadamente ${minutosRetraso} minutos detenido.`,
    metadata: {
      vehiculo_id: vehiculoId,
      ruta_id: rutaId,
      minutos_retraso: minutosRetraso,
    },
    leida: false,
    fecha: new Date().toISOString(),
  }))

  const { data, error } = await supabase
    .from("notificaciones")
    .insert(notificaciones)

  return { data, error }
}

// Obtener todos los usuarios para notificar
// (ajusta esta query según tu tabla de relación usuario-ruta)
export const getUsuariosParaNotificar = async () => {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")

  return { data, error }
}

// Obtener vehículo con su ruta
export const getVehiculoConRuta = async (vehiculoId) => {
  const { data, error } = await supabase
    .from("vehiculos")
    .select("ruta_id, rutas(nombre, numero_ruta)")
    .eq("id", vehiculoId)
    .single()

  return { data, error }
}

// Obtener administradores para notificar
export const getAdministradores = async () => {
  const {data, error} = await supabase
  .from("profiles")
  .select("id, nombre, rol")
  .eq("rol", "administrador")

  return {data, error}
}



// Notificar al conductor que se le asignó una ruta
export const notificarConductorAsignado = async ({
    conductorId,
    nombreRuta,
    numeroRuta,
    horaInicio,
    horaFin,
    turno,
}) => {
    const { error } = await supabase
        .from('notificaciones')
        .insert({
            usuario_id: conductorId,
            tipo: 'ruta_asignada',
            titulo: 'Nueva ruta asignada',
            mensaje: `Se te ha asignado la ruta ${numeroRuta} - ${nombreRuta}. Horario: ${horaInicio} - ${horaFin} (${turno}).`,
            metadata: {
                numero_ruta: numeroRuta,
                nombre_ruta: nombreRuta,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                turno,
            },
            leida: false,
            fecha: new Date().toISOString(),
        });

    return { error };
};

// Enviar notificación del conductor al administrador
export const enviarNotificacionConductor = async ({
  conductorId,
  conductorNombre,
  cedula,
  celular,
  tipo,
  titulo,
  mensaje,
  urgente = false,
}) => {
  const { data: admins, error: eAdmins } = await getAdministradores();
  if (eAdmins) return { error: eAdmins };
  if (!admins || admins.length === 0) return { error: new Error("No hay administradores registrados") };

  const notificaciones = admins.map((admin) => ({
    usuario_id: admin.id,
    tipo,
    titulo,
    mensaje,
    metadata: {
      conductor_id:     conductorId,
      conductor_nombre: conductorNombre,
      cedula,
      celular,
      urgente,
    },
    leida: false,
    fecha: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("notificaciones")
    .insert(notificaciones);

  return { data, error };
};