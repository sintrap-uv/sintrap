import { supabase } from "./supabase";

export const obtenerRutaActuaUsuario = async (userId) => {
  const { data, error } = await supabase
    .from("usuario_ruta")
    .select(
      `
      id,
      ruta_id,
      parada_origen_id,
      parada_destino_id,
      rutas(
        id,
        numero_ruta,
        nombre,
        trayecto,
        color,
        activa
      )
    `,
    )
    .eq("usuario_id", userId)
    .eq("activa", true)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo ruta del usuario:", error);
    return null;
  }

  return data;
};

export const obtenerParadasRuta = async (rutaId) => {
  const { data, error } = await supabase
    .from("ruta_paradas")
    .select(
      `
      id,
      parada_id,
      orden,
      tiempo_desde_inicio,
      paradas(
        id,
        nombre,
        latitud,
        longitud,
        descripcion
      )
    `,
    )
    .eq("ruta_id", rutaId)
    .order("orden", { ascending: true });

  if (error) {
    console.error("Error obteniendo paradas:", error);
    return [];
  }

  return data || [];
};

export const obtenerUbicacionBusActual = async (rutaId) => {
  const { data: horarios, error: errHorarios } = await supabase
    .from("ruta_horarios")
    .select("vehiculo_id")
    .eq("ruta_id", rutaId)
    .eq("activo", true);

  if (errHorarios || !horarios?.length) {
    console.error("Error obteniendo horarios:", errHorarios);
    return null;
  }

  const vehiculoIds = horarios.map((h) => h.vehiculo_id);

  const { data, error } = await supabase
    .from("ubicacion_conductor")
    .select(
      `
      conductor_id,
      vehiculo_id,
      latitud,
      longitud,
      velocidad,
      updated_at
    `,
    )
    .in("vehiculo_id", vehiculoIds)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error obteniendo ubicación del bus:", error);
    return null;
  }

  return data;
};
