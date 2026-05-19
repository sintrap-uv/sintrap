// services/zonas.js
// Agrupa colaboradores por cercanía para crear rutas eficientes

import { calcularDistancia } from './geocalizacion';

export const agruparPorCercania = (colaboradores, radioKm = 0.3) => {
    if (!colaboradores || !Array.isArray(colaboradores) || colaboradores.length === 0) {
        console.log("No hay colaboradores para agrupar");
        return [];
    }

    const grupos = [];
    const usados = new Set();

    for (const colaborador of colaboradores) {
        if (usados.has(colaborador.id)) continue;

        //  estructura nueva: latitud y longitud están directamente en el objeto
        if (!colaborador.latitud || !colaborador.longitud) {
            console.log(` ${colaborador.profiles?.nombre} no tiene coordenadas válidas`);
            continue;
        }

        const grupo = {
            id: grupos.length + 1,
            colaboradores: [colaborador],
            cantidad: 1,
            centro: {
                lat: colaborador.latitud,
                lon: colaborador.longitud
            },
            radio: radioKm
        };

        usados.add(colaborador.id);

        for (const otro of colaboradores) {
            if (usados.has(otro.id) || colaborador.id === otro.id) continue;
            if (!otro.latitud || !otro.longitud) continue;

            const distancia = calcularDistancia(
                colaborador.latitud, colaborador.longitud,
                otro.latitud, otro.longitud
            );

            if (distancia <= radioKm) {
                grupo.colaboradores.push(otro);
                grupo.cantidad++;
                usados.add(otro.id);
            }
        }

        grupos.push(grupo);
    }

    console.log(`Se crearon ${grupos.length} grupos`);
    return grupos;
};