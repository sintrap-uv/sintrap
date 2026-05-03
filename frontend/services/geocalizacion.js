import { supabase } from "./supabase";

//bamos a convertir la direccion de los colaboradores en datos de latidud y longitud 
// y lo guardaremos en la tabla de supabase con sus respectivas columnas 


export async function ubicacionUsuario(userId, direccion, latidud, longitud) {

    const { data, error } = await supabase
        .from('ubicacion_usuario')
        .insert({
            usuario_id: userId,
            direccion: direccion,
            latidud: latidud,
            longitud: longitud,
            
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

export const calcularDistancia = (lat1, long1,lat2,long2)=>{
    const radioTierra = 6371;

    const convertiaRadiantes = (grados) => grados * Math.PI / 180;

    //Diferencia entre coordenadas
    const dlat = convertiaRadiantes(lat2 -lat1)
    const dlon = convertiaRadiantes(long2 - long1);

    //formula de Haversine 
    const a = Math.sin(dlat / 2) * Math.sin(dlat / 2) +
              Math.cos(convertiaRadiantes(lat1)) * Math.cos(convertiaRadiantes(lat2)) *
              Math.sin(dlon / 2) * Math.sin(dlon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    // Distancia final en kilómetros
    const distancia = radioTierra * c;
    
    return distancia;
}