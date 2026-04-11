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