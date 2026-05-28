import { supabase } from "./supabase";

export const ubicacionBuses = async (lat, lon) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No hay una sesión de administrador activa.");

        //  Verificar si YA EXISTE configuración (sin importar quién)
        const { data: existeConfig } = await supabase
            .from('configuracion_buses')
            .select('id')
            .limit(1);
        
        if (existeConfig && existeConfig.length > 0) {
            return { 
                success: false, 
                error: "La ubicación de salida ya fue configurada. No se puede modificar." 
            };
        }

        const puntoWKT = `POINT(${lon} ${lat})`;

        const { data, error } = await supabase
            .from('configuracion_buses')
            .insert({
                id: user.id,
                ubicacion_salida: puntoWKT,
                creado_en: new Date().toISOString(),
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

// CORREGIDO: No filtrar por usuario, solo verificar si existe ALGÚN registro
export const existeConfiguracionBuses = async () => {
    try {
        const { data, error } = await supabase
            .from('configuracion_buses')
            .select('id')
            .limit(1);

        if (error) {
            console.error("Error verificar configuracion:", error);
            return false;
        }

        return data && data.length > 0;
    } catch (error) {
        console.error("Error:", error);
        return false;
    }
};

export const verificarConfiguracionExistente = async () => {
    try {
        const { data, error } = await supabase
            .from('configuracion_buses')
            .select('id')
            .limit(1);

        if (error) {
            console.error("Error verificando configuración:", error);
            return { existe: false };
        }

        return { existe: data && data.length > 0 };
    } catch (error) {
        console.error("Error:", error);
        return { existe: false };
    }
};

// CORREGIDO: No filtrar por usuario
export const obtenerUbicacionBuses = async () => {
    try {
        const { data, error } = await supabase
            .rpc('obtener_ubicacion_buses');

        if (error) {
            console.error("Error obteniendo ubicacion:", error);
            return null;
        }

        if (!data || data.length === 0) return null;

        console.log("✅ Ubicacion empresa:", data[0]);
        return { lat: data[0].lat, lon: data[0].lon };
    } catch (error) {
        console.error("Error:", error);
        return null;
    }
};