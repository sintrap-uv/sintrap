import NotificacionesAdmin from "./NotificacionesAdmin"
import NotificacionesUsuario from "./NotificacionesUsuario"
// Este componente debe verificarse bien en el manejo de los roles para ejecutar la lógica correcta. Se asume que el rol se obtiene de forma segura (ej: desde el token o contexto global) para evitar que un usuario malintencionado pueda acceder a funciones administrativas.
export default function Notificaciones({ usuarioId, rol }) {
  if (rol === "administrador") {
    return <NotificacionesAdmin usuarioId={usuarioId} />
  }
  return <NotificacionesUsuario usuarioId={usuarioId} />
}