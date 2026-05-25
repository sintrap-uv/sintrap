const calcularDistancia = (lat1, lat2, lon1, lon2) => {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    return Math.sqrt(dLat * dLat + dLon * dLon);
}



const ordenarGruposPorCercaniaALaEmpresa = (grupos, empresaUbicacion) => {
    return [...grupos]
        .map(grupo => ({
            ...grupo,
            distancia: calcularDistancia(
                grupo.centro.lat, grupo.centro.lon,
                empresaUbicacion.lat, empresaUbicacion.lon
            )
        }))
        .sort((a, b) => a.distancia - b.distancia);
}

const convertirGruposAPuntos = (gruposOrdenados) =>
    gruposOrdenados.map((grupo, i) => ({
        id: `${Date.now()}_${i}`,
        lat: grupo.centro.lat,
        lon: grupo.centro.lon,
        direccion: `Grupo ${i + 1} - ${grupo.colaboradores.length} colaboradores`
    }));

export const generarRutaOptima = (grupos, empresaUbicacion) => {
    if (!grupos?.length || !empresaUbicacion) return [];
    const gruposOrdenados = ordenarGruposPorCercaniaALaEmpresa(grupos, empresaUbicacion);
    return convertirGruposAPuntos(gruposOrdenados);
};