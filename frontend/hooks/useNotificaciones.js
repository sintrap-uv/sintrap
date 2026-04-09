import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"
import {
  getNotificaciones,
  marcarNotificacionLeida,
  marcarTodasLeidas as marcarTodasLeidasService,
} from "../services/notificaciones"
// Hook para manejar notificaciones en tiempo real. Carga las notificaciones del usuario y se suscribe a nuevos eventos para actualizar la lista automáticamente.
export function useNotificaciones(usuarioId) {
  const [notificaciones, setNotificaciones] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!usuarioId) return

    const cargar = async () => {
      setLoading(true)
      const { data } = await getNotificaciones(usuarioId)
      setNotificaciones(data ?? [])
      setLoading(false)
    }

    cargar()

    const canal = supabase
      .channel(`notificaciones-${usuarioId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload) => {
          setNotificaciones((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [usuarioId])

  const marcarLeida = async (id) => {
    await marcarNotificacionLeida(id)
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    )
  }

  const marcarTodas = async () => {
    await marcarTodasLeidasService(usuarioId)
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
  }

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  return { notificaciones, loading, noLeidas, marcarLeida, marcarTodas }
}