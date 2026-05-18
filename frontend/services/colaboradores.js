import { supabase } from "./supabase";

export const ubicacionColaboradores = async () => {
    try {
        const { data, error } = await supabase
            .from('ubicacion_usuario')
            .select(`
                id,
                latitud,
                longitud,
                direccion,
                updated_at,
                profiles!inner (
                    id,
                    nombre,
                    cedula,
                    celular,
                    activo
                )
            `)
            .not('latitud', 'is', null)
            .not('longitud', 'is', null)
            .eq('profiles.rol', 'usuario')
            .eq('profiles.activo', true)

        if (error) {
            console.error("Error al obtener colaboradores:", error);
            return [];
        }

        return data ?? [];

    } catch (error) {
        console.error("Error en ubicacionColaboradores:", error);
        return [];
    }
};

export async function UbicacionUsuarioActulizada(userId, direccion, latitud, longitud) {
    const { data, error } = await supabase
        .from('ubicacion_usuario')
        .upsert(
            {
                usuario_id: userId,
                direccion: direccion,
                latitud: latitud,
                longitud: longitud,
                updated_at: new Date().toISOString(), // ✅ Agrega esto
                fecha: new Date().toISOString(),
            },
            { onConflict: 'usuario_id' }
        )
        .select()
        .single();

    if (error) {
        console.error("Error actualizando ubicación:", error);
    } else {
        console.log("Ubicación actualizada:", data);
    }
    return { data, error };
}


export const ubicacionColaboradoresId = async (userId) => {
    if (!userId) return null;
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            id,
            nombre,
            cedula,
            celular,
            rol,
            activo,
            ubicacion_usuario (
                id,
                direccion,
                latitud,
                longitud,
                updated_at
            )
        `)
        .eq('id', userId)
        .single();
    if (error) {
        console.error(`Error obteniendo colaborador ${userId}:`, error);
        return null;
    }
    return data;
};