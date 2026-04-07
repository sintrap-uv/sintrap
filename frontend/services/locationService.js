import { supabase } from "./supabase";

/**
 * Actualiza o inserta la ubicación de un usuario.
 */
export async function actualizarUbicacionUsuario(
  userId,
  latitude,
  longitude,
  direccion = null,
) {
  try {
    const puntoWKT = `POINT(${longitude} ${latitude})`; // longitud primero

    const { data, error } = await supabase.from("ubicacion_usuario").upsert(
      {
        usuario_id: userId,
        ubicacion: puntoWKT,
        direccion: direccion,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "usuario_id" },
    );

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error en actualizarUbicacionUsuario:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Obtiene la ubicación guardada de un usuario como números normales.
 *
 * La función get_ubicacion_usuario() que creamos en la DB usa
 * ST_X() y ST_Y() para extraer longitud y latitud como números,
 * y los devuelve listos para usar. Así el service es simple y limpio.
 *
 * PGRST116
 * Es el código de error de PostgREST cuando una query no encuentra
 * ninguna fila. Para nosotros NO es un error — simplemente significa
 * que el usuario aún no tiene ubicación guardada (primera vez).
 */
export async function obtenerUbicacionUsuario(userId) {
  try {
    const { data, error } = await supabase
      .rpc("get_ubicacion_usuario", { p_usuario_id: userId })
      .single();

    // PGRST116 = sin resultados → usuario sin ubicación aún, no es error
    if (error && error.code !== "PGRST116") throw error;

    return { success: true, data: data ?? null };
  } catch (error) {
    console.error("Error en obtenerUbicacionUsuario:", error.message);
    return { success: false, error: error.message };
  }
}
