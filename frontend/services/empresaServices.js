import { supabase } from "./supabase";

export const ubicacionBuses = async (lat, lon) => {
    try {
        const puntoWKT = `POINT(${lon} ${lat})`;
        const { data, error } = await supabase
            .from('configuracion_buses')
            .upsert({ id: 1, ubicacion_salida: puntoWKT });
        if (error) {
            return { success: false, error: error.message }
        }

        return { success: true, data: data }

    } catch (error) {
        console.log("hubo un problema", error)
        return { success: false, error: error.message }


    }
}

//vamos a verificar si existen la ubicacion de los buses
export const existeConfiguracionBuses = async () => {
    const { data, error } = await supabase
        .from('configuracion_buses')
        .select('ubicacion_salida')
        .eq('id', 1)
        .maybeSingle();

    if (error) {
        console.log("Error verificar configuracion:", error)
        return false
    }
    if (!data || !data.ubicacion_salida) return false;

    return true;
};

//vamos a obtener la ubicacion de los buses
export const obtenerUbicacionBuses = async () => {
    const { data, error } = await supabase
        .rpc('obtener_ubicacion_buses_geojson')

    if (error || !data) return null;

    // data es un objeto GeoJSON: { type: "Point", coordinates: [lon, lat] }
    const [lon, lat] = data.coordinates;
    return { lat, lon };
}