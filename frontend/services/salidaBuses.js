import { supabase } from "./supabase";

export const ubicacionBuses = async (lat, lon) => {
   try {
        // Obtenemos el usuario autenticado
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) throw new Error("No hay una sesión de administrador activa.");

        const puntoWKT = `POINT(${lon} ${lat})`;

        const { data, error } = await supabase
            .from('configuracion_buses')
            .upsert({ 
                id: user.id, // Usamos su UID de auth.users
                ubicacion_salida: puntoWKT,
                actualizado_en: new Date().toISOString()
            })
            .select();

        if (error) return { success: false, error: error.message };

        return { success: true, data: data };

    } catch (error) {
        console.error("Hubo un problema:", error);
        return { success: false, error: error.message };
    }
}

//vamos a verificar si existen la ubicacion de los buses
export const existeConfiguracionBuses = async () => {
   const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
        .from('configuracion_buses')
        .select('ubicacion_salida')
        .eq('id', user.id) // Filtramos por su ID único
        .maybeSingle();

    if (error) {
        console.error("Error verificar configuracion:", error);
        return false;
    }
    
    return !!(data && data.ubicacion_salida);
};

//vamos a obtener la ubicacion de los buses
export const obtenerUbicacionBuses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .rpc('obtener_ubicacion_buses', { user_id: user.id });

    if (error) {
        console.error("Error obteniendo ubicacion:", error);
        return null;
    }

    if (!data || data.length === 0) return null;

    console.log("✅ Ubicacion empresa:", data[0]);
    return { lat: data[0].lat, lon: data[0].lon };

};