import { supabase } from "./supabase";

export const ubicacionColaboradores = async () => {
    try {
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
                    latidud,
                    longitud,
                    updated_at
                )
            `)
            .eq('rol', 'usuario');

        if (error) {
            console.error("Error al obtener colaboradores:", error);
            return []; // Siempre retornar un array vacío en caso de error
        }

        // Si data es null o undefined, retornar array vacío
        if (!data) {
            console.log("No hay datos");
            return [];
        }

        // Filtrar solo los que tienen ubicación con coordenadas válidas
        const conUbicacion = data.filter(user => {
            const ubicacion = user.ubicacion_usuario;
            // Verificar si existe ubicación y tiene coordenadas válidas
            if (!ubicacion) return false;
            
            // Si es un array
            if (Array.isArray(ubicacion) && ubicacion.length > 0) {
                const ubi = ubicacion[0];
                return ubi && ubi.latidud && ubi.longitud;
            }
            
            // Si es un objeto
            if (ubicacion && typeof ubicacion === 'object') {
                return ubicacion.latidud && ubicacion.longitud;
            }
            
            return false;
        });

        console.log(`📍 Colaboradores con coordenadas válidas: ${conUbicacion.length}`);
        return conUbicacion;
        
    } catch (error) {
        console.error("Error en ubicacionColaboradores:", error);
        return []; // Siempre retornar array vacío
    }
};



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
                latidud,
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