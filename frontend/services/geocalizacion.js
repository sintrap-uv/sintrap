import { supabase } from "./supabase";

// Convierte dirección en coordenadas usando OpenStreetMap
export const obtenerCordenadas = async (direccion) => {
    try {
        const direccionCodificada = encodeURIComponent(direccion);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${direccionCodificada}&limit=1`;

        const respuesta = await fetch(url, {
            headers: { 'User-Agent': 'SintrapApp' }
        });
        const datos = await respuesta.json();

        if (datos.length > 0) {
            return {
                latitud: parseFloat(datos[0].lat),
                longitud: parseFloat(datos[0].lon)
            };
        }
        throw new Error("No encontramos esa dirección");

    } catch (error) {
        console.error('Error buscando en OSM', error);
        return null;
    }
};

// Guarda o actualiza la ubicación del usuario (upsert)
// ← esta es la ÚNICA función para guardar, sirve tanto para crear como para actualizar
export async function guardarUbicacionUsuario(userId, direccion, latitud, longitud) {
    const { data, error } = await supabase
        .from('ubicacion_usuario')
        .upsert(
            {
                usuario_id: userId,
                direccion: direccion,
                latitud: latitud,
                longitud: longitud,
            },
            { onConflict: 'usuario_id' }
        )
        .select()
        .single();

    if (error) console.error("Error guardando ubicación:", error);
    else console.log("Ubicación guardada:", data);

    return { data, error };
}

// Obtiene la dirección guardada de un usuario
export const ObtenerDireccionUsuario = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('ubicacion_usuario')
            .select('direccion')
            .eq('usuario_id', userId)
            .maybeSingle();

        if (error) {
            console.error("Error obteniendo la direccion", error);
            return null;
        }
        return data;
    } catch (error) {

        return null;
    }
};

// Calcula distancia entre dos coordenadas en kilómetros (fórmula Haversine)
export const calcularDistancia = (lat1, long1, lat2, long2) => {
    const radioTierra = 6371;
    const toRad = (grados) => grados * Math.PI / 180;

    const dlat = toRad(lat2 - lat1);
    const dlon = toRad(long2 - long1);

    const a = Math.sin(dlat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dlon / 2) ** 2;

    return radioTierra * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};