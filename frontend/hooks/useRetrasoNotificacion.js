import { useEffect, useRef } from "react"
import { supabase } from "../services/supabase"
import {
  getVehiculoConRuta,
  getUsuariosParaNotificar,
  insertarNotificacionRetraso,
} from "../services/notificaciones"
// Detectamos los retrasos de los buses y notificamos a los usuarios afectados, con un cooldown para evitar spam. Ajusta los umbrales según tu contexto.
const UMBRAL_MINUTOS = 10
const UMBRAL_VELOCIDAD = 2
const COOLDOWN_MS = 15 * 60 * 1000

export function useRetrasoNotificacion() {
  const ultimaNotificacion = useRef({})

  useEffect(() => {
    const canal = supabase
      .channel("retraso-detector")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "ubicacion_conductor" },
        async (payload) => {
          const uc = payload.new

          if (!uc.en_ruta) return
          if ((uc.velocidad ?? 0) > UMBRAL_VELOCIDAD) return

          const ahora = Date.now()
          const vehiculoId = uc.vehiculo_id

          if (
            ultimaNotificacion.current[vehiculoId] &&
            ahora - ultimaNotificacion.current[vehiculoId] < COOLDOWN_MS
          ) return

          const ultimaActualizacion = new Date(uc.updated_at)
          const minutosDetenido = (ahora - ultimaActualizacion.getTime()) / 60000

          if (minutosDetenido < UMBRAL_MINUTOS) return

          ultimaNotificacion.current[vehiculoId] = ahora

          const { data: vehiculo } = await getVehiculoConRuta(vehiculoId)
          if (!vehiculo?.ruta_id) return

          const nombreRuta = vehiculo.rutas?.nombre ?? `Ruta ${vehiculo.rutas?.numero_ruta}`
          const minutosRetraso = Math.round(minutosDetenido)

          const { data: perfiles } = await getUsuariosParaNotificar()
          if (!perfiles?.length) return

          await insertarNotificacionRetraso({
            usuarioIds: perfiles.map((p) => p.id),
            nombreRuta,
            minutosRetraso,
            vehiculoId,
            rutaId: vehiculo.ruta_id,
          })
        }
      )
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])
}