import { supabase } from "./supabase";

/**
 * Obtiene todas las métricas principales del panel administrador.
 * Se ejecuta en paralelo con Promise.all para minimizar tiempo de carga.
 */
export async function getMetricasAdmin() {
  try {
    const [
      { data: perfiles },
      { data: vehiculos },
      { data: rutas },
      { data: turnos },
      { data: reportes },
      { data: notificaciones },
    ] = await Promise.all([
      supabase.from("profiles").select("rol, activo, fecha_registro"),
      supabase
        .from("vehiculos")
        .select("activo, seguro, fecha_vencimiento, capacidad, ruta_id"),
      supabase.from("rutas").select("id, numero_ruta, nombre, color, activa"),
      supabase
        .from("turnos")
        .select("estado, fecha")
        .eq("fecha", new Date().toISOString().split("T")[0]),
      supabase.from("reportes").select("estado"),
      supabase.from("notificaciones").select("leida").eq("leida", false),
    ]);

    const usuariosActivos =
      perfiles?.filter((p) => p.rol === "usuario" && p.activo).length ?? 0;
    const conductoresActivos =
      perfiles?.filter((p) => p.rol === "conductor" && p.activo).length ?? 0;
    const busesActivos = vehiculos?.filter((v) => v.activo).length ?? 0;
    const rutasActivas = rutas?.filter((r) => r.activa).length ?? 0;
    const turnosEnCurso =
      turnos?.filter((t) => t.estado === "en_curso").length ?? 0;
    const reportesPendientes =
      reportes?.filter((r) => r.estado === "pendiente").length ?? 0;
    const notifNoLeidas = notificaciones?.length ?? 0;

    // Alertas de vehículos
    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(hoy.getDate() + 30);
    const segurosVencidos =
      vehiculos?.filter(
        (v) =>
          v.activo &&
          v.fecha_vencimiento &&
          new Date(v.fecha_vencimiento) < hoy,
      ).length ?? 0;
    const segurosPorVencer =
      vehiculos?.filter(
        (v) =>
          v.activo &&
          v.fecha_vencimiento &&
          new Date(v.fecha_vencimiento) >= hoy &&
          new Date(v.fecha_vencimiento) <= en30dias,
      ).length ?? 0;
    const sinSeguro =
      vehiculos?.filter((v) => v.activo && !v.seguro).length ?? 0;

    return {
      success: true,
      data: {
        metricas: {
          usuariosActivos,
          conductoresActivos,
          busesActivos,
          rutasActivas,
          turnosEnCurso,
          reportesPendientes,
          notifNoLeidas,
        },
        alertas: { segurosVencidos, segurosPorVencer, sinSeguro },
      },
    };
  } catch (error) {
    console.error("Error en getMetricasAdmin:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Ocupación actual de cada ruta activa.
 */
export async function getOcupacionRutas() {
  try {
    const { data: rutas, error: eRutas } = await supabase
      .from("rutas")
      .select("id, numero_ruta, nombre, color")
      .eq("activa", true)
      .order("numero_ruta");

    if (eRutas) throw eRutas;

    const ocupacion = await Promise.all(
      rutas.map(async (ruta) => {
        // 1. Obtener cantidad de usuarios asignados
        const { count: asignados } = await supabase
          .from("usuario_ruta")
          .select("*", { count: "exact", head: true })
          .eq("ruta_id", ruta.id);

        // 2. Obtener vehículo asignado desde ruta_horarios
        const { data: horarioActivo } = await supabase
          .from("ruta_horarios")
          .select("vehiculo_id")
          .eq("ruta_id", ruta.id)
          .not("vehiculo_id", "is", null)
          .maybeSingle();

        let capacidad = 0;
        let tieneVehiculo = false;

        if (horarioActivo && horarioActivo.vehiculo_id) {
          // 3. Obtener tipo_vehiculo_id desde vehiculos
          const { data: vehiculo } = await supabase
            .from("vehiculos")
            .select("tipo_vehiculo_id")
            .eq("id", horarioActivo.vehiculo_id)
            .single();

          if (vehiculo && vehiculo.tipo_vehiculo_id) {
            // 4. Obtener capacidad_max desde tipo_vehiculo
            const { data: tipoVehiculo } = await supabase
              .from("tipo_vehiculo")
              .select("capacidad_max")
              .eq("id", vehiculo.tipo_vehiculo_id)
              .single();

            if (tipoVehiculo) {
              capacidad = tipoVehiculo.capacidad_max || 0;
              tieneVehiculo = true;
            }
          }
        }

        const porcentaje = capacidad > 0 ? Math.round(((asignados || 0) / capacidad) * 100) : 0;

        return {
          ...ruta,
          asignados: asignados ?? 0,
          capacidad,
          porcentaje,
          tieneVehiculo,
        };
      })
    );

    return { success: true, data: ocupacion };
  } catch (error) {
    console.error("Error en getOcupacionRutas:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Actividad reciente del sistema (últimos 6 eventos combinados).
 */
export async function getActividadReciente() {
  try {
    const [{ data: usuarios }, { data: buses }, { data: turnos }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("nombre, rol, fecha_registro")
          .order("fecha_registro", { ascending: false })
          .limit(4),
        supabase
          .from("vehiculos")
          .select("placa, fecha_inicio")
          .not("fecha_inicio", "is", null)
          .order("fecha_inicio", { ascending: false })
          .limit(3),
        supabase
          .from("turnos")
          .select("estado, hora_inicio_real, conductor_id")
          .not("hora_inicio_real", "is", null)
          .order("hora_inicio_real", { ascending: false })
          .limit(3),
      ]);

    const actividad = [
      ...(usuarios?.map((u) => ({
        tipo: u.rol === "conductor" ? "conductor" : "usuario",
        descripcion: `${u.rol === "conductor" ? "Conductor" : "Usuario"} registrado: ${u.nombre}`,
        fecha: u.fecha_registro,
      })) ?? []),
      ...(buses?.map((b) => ({
        tipo: "bus",
        descripcion: `Bus registrado: ${b.placa}`,
        fecha: b.fecha_inicio,
      })) ?? []),
      ...(turnos?.map((t) => ({
        tipo: "turno",
        descripcion: `Turno iniciado por conductor`,
        fecha: t.hora_inicio_real,
      })) ?? []),
    ]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 6);

    return { success: true, data: actividad };
  } catch (error) {
    console.error("Error en getActividadReciente:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Formatea una fecha a tiempo relativo legible.
 * "Hace 5 minutos", "Hace 2 horas", "Ayer", etc.
 */
export function tiempoRelativo(fechaStr) {
  const ahora = new Date();
  const fecha = new Date(fechaStr);
  const diffMs = ahora - fecha;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHoras = Math.floor(diffMin / 60);
  const diffDias = Math.floor(diffHoras / 24);

  if (diffMin < 1) return "Ahora mismo";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHoras < 24) return `Hace ${diffHoras}h`;
  if (diffDias === 1) return "Ayer";
  return `Hace ${diffDias} días`;
}
