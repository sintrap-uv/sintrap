// services/zonas.js
// Agrupa colaboradores por cercanía para crear rutas eficientes

import { calcularDistancia } from './geocalizacion';

/**
 * Agrupa colaboradores que viven cerca unos de otros
 * @param {Array} colaboradores - Lista de colaboradores con ubicación
 * @param {number} radioKm - Radio en kilómetros para considerar "cerca" (default: 0.3 = 300m)
 * @returns {Array} Grupos de colaboradores cercanos
 */
export const agruparPorCercania = (colaboradores, radioKm = 0.3) => {
    // Validar que tenemos datos
    if (!colaboradores || !Array.isArray(colaboradores) || colaboradores.length === 0) {
        console.log("No hay colaboradores para agrupar");
        return [];
    }
    
    // Resto del código igual...
    const grupos = [];
    const usados = new Set();
    
    for (const colaborador of colaboradores) {
        if (usados.has(colaborador.id)) continue;
        
        // Obtener ubicación (puede ser array u objeto)
        let ubicacionCol = colaborador.ubicacion_usuario;
        
        // Si es array, tomar el primero
        if (Array.isArray(ubicacionCol) && ubicacionCol.length > 0) {
            ubicacionCol = ubicacionCol[0];
        }
        
        if (!ubicacionCol || !ubicacionCol.latidud || !ubicacionCol.longitud) {
            console.log(`⚠️ ${colaborador.nombre} no tiene coordenadas válidas`);
            continue;
        }
        
        // Crear nuevo grupo...
        const grupo = {
            id: grupos.length + 1,
            colaboradores: [colaborador],
            cantidad: 1,
            centro: {
                lat: ubicacionCol.latidud,
                lon: ubicacionCol.longitud
            },
            radio: radioKm
        };
        
        usados.add(colaborador.id);
        
        // Buscar colaboradores cercanos
        for (const otro of colaboradores) {
            if (usados.has(otro.id) || colaborador.id === otro.id) continue;
            
            let ubicacionOtro = otro.ubicacion_usuario;
            if (Array.isArray(ubicacionOtro) && ubicacionOtro.length > 0) {
                ubicacionOtro = ubicacionOtro[0];
            }
            
            if (!ubicacionOtro || !ubicacionOtro.latidud || !ubicacionOtro.longitud) continue;
            
            const distancia = calcularDistancia(
                ubicacionCol.latidud, ubicacionCol.longitud,
                ubicacionOtro.latidud, ubicacionOtro.longitud
            );
            
            if (distancia <= radioKm) {
                grupo.colaboradores.push(otro);
                grupo.cantidad++;
                usados.add(otro.id);
            }
        }
        
        grupos.push(grupo);
    }
    
    console.log(`✅ Se crearon ${grupos.length} grupos`);
    return grupos;
};