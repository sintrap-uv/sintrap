import { supabase } from "./supabase";

//bamos a convertir la direccion de los colaboradores en datos de latidud y longitud 
// y lo guardaremos en la tabla de supabase con sus respectivas columnas 


export async function ubicacionUsuario(userId, direccion, longitud, latidud) {

    const { data, error } = await supabase
        .from('ubicacion_usuario')
        .insert({
            usuario_id: userId,
            direccion: direccion,
            longitud: longitud,
            latidud: latidud,
        })
        .select()
        .single();
    if (error) {
        console.error("ERROR INSERTANDO:", error);
    } else {
        console.log("GUARDADO OK:", data);
    }
    return { data, error };
}

export const buscarDirecciones = async (texto) => {
    if (texto.length < 4) return [];

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}&countrycodes=co&limit=5`;

        const res = await fetch(url, {
            headers: { 'User-Agent': 'SintrapApp' }
        });

        const data = await res.json();

        return data;

    } catch (error) {
        console.log("Error buscando direcciones", error);
        return [];
    }
};


export const obtenerCordenadas = async (direccion,) => {
    try {
        const direccionCodificada = encodeURIComponent(direccion)

        //implementmaos la direccion de OpenstreetMap
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${direccionCodificada}&limit=1`;

        const respuesta = await fetch(url, {
            headers: {
                'User-Agent': 'SintrapApp'
            }
        });

        const datos = await respuesta.json();

        if (datos.length > 0) {
            return {
                latitud: parseFloat(datos[0].lat),
                longitud: parseFloat(datos[0].lon)
            };
        }
        else {
            throw new Error("No encontramos esa dirección");

        }

    } catch (error) {
        console.error('Error buscando en OSM', error);
        return null;
    }
}

//se hace una busqueda en supabase
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
        console.error("Error inesperado:", er);
        return null;
    }

};

