import { supabase } from "./supabase";


export async function crearRuta(nombre, numeroRuta, trayecto) {

    const datosInsertar = {
        numero_ruta: numeroRuta,
        nombre: nombre,
        activa: true,
        fecha_registro: new Date().toISOString().split('T')[0]
    }
    if (trayecto) {
        datosInsertar.trayecto = trayecto;
    }

    const { data, error } = await supabase
        .from('rutas')
        .insert(datosInsertar)
        .select()
        .single()

    if (error) {
        console.log("Error al insertar los datos", error)
    }
    else {
        console.log("Datos de ruta guardados exitosamente", data)
    }
    return { data, error };
}

export const guardarRutaCompleta = async (nombre, numeroRuta, puntosRuta) => {
    // Convertir puntosRuta a formato JSONB que espera la función
    // puntosRuta es array de objetos con lat, lon. Necesitas lon, lat.
    const puntosParaEnvio = puntosRuta.map(punto => ({
        lon: punto.lon,
        lat: punto.lat
    }));

    const { data, error } = await supabase
        .rpc('guardar_ruta', {
            p_nombre: nombre,
            p_numero_ruta: parseInt(numeroRuta),
            p_puntos: puntosParaEnvio
        });

    if (error) {
        console.error("Error guardando ruta:", error);
        throw error;
    }
    return data;
};


export async function crearRutaParadas(nombre, latidud, longitud, descripcion) {

    const puntoGeo = `POINT(${longitud} ${latitud})`;

    const { data, error } = await supabase

        .from('paradas')
        .insert({
            nombre: nombre,
            ubicacion: puntoGeo,
            descripcion: descripcion,
            activa: true
        })
        .select()
        .single();

    if (error) {
        console.log("Error al insertar los datos ", error);
    }
    else {
        console.log("Datos de paradas guardados exitosamente", data)
    }
    return { data, error };
}

// Función adicional para obtener rutas guardadas
export async function obtenerRutas() {
    const { data, error } = await supabase
        .from('rutas')
        .select(`
            *,
            ruta_paradas (
                orden,
                paradas (
                    id,
                    nombre,
                    ubicacion,
                    descripcion
                )
            )
        `)
        .order('fecha_registro', { ascending: false });

    if (error) {
        console.log("Error al obtener rutas", error);
        return { data: null, error };
    }

    return { data, error: null };
}

// Función para obtener una ruta específica con todos sus detalles
export async function obtenerRutaPorId(id) {
    const { data, error } = await supabase
        .from('rutas')
        .select(`
            *,
            ruta_paradas (
                orden,
                tiempo_desde_inicio,
                paradas (
                    id,
                    nombre,
                    ubicacion,
                    descripcion,
                    activa
                )
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.log("Error al obtener la ruta", error);
        return { data: null, error };
    }

    return { data, error: null };
}
