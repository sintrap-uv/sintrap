import { supabase } from "./supabase";


export async function crearRuta(nombre, numeroRuta) {
    const { data, error } = await supabase
        .from('rutas')
        .insert({
            numero_ruta: numeroRuta,
            nombre: nombre
        })
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

export async function crearRutaParadas(nombre, latidud, longitud, descripcion) {

    const { data, error } = await supabase

        .from('paradas')
        .insert({
            nombre: nombre,
            ubicacion: `POINT(${longitud} ${latidud})`,
            descripcion: descripcion
        })
    if (error) {
        console.log("Error al insertar los datos ", error);
    }
    else {
        console.log("Datos de paradas guardados exitosamente", data)
    }
    return { data, error };
}
export async function guardarRutaCompleta(nombre, numero_ruta, puntos, ubicacionEmpresa) {

    const resultadoCrearRuta = await crearRuta(nombre, numero_ruta)

    let idRuta

    if (resultadoCrearRuta.error) {
        console.log("Error al obtner datos")
        return
    } else {
        idRuta = resultadoCrearRuta.data.id
    }

    const paradasIds = []

    for (let i = 0; i < puntos.length; i++) {
        const resultadoParadas = await
            crearRutaParadas(puntos[i].direccion,
                puntos[i].lat,
                puntos[i].lon,
                "Colaborador"
            )
        if (resultadoParada.error) {
            console.log("Error al crear parada", resultadoParada.error)
            return
        }

        paradasIds.push(resultadoParadas.data.id)
    }
    //creamos la parada de la empresa 
    const resultadoParadaEmpresa = await crearRutaParadas(
        "Empresa",
        ubicacionEmpresa.lat,
        ubicacionEmpresa.lon,
        "Punto final de la ruta"
    )
    if (resultadoParadaEmpresa.error) {
        console.log("Error al crear parada de empresa", resultadoParadaEmpresa.error)
        return
    }
    for (let i = 0; i < paradasIds.length; i++) {
        const { error } = await supabase
            .from('ruta_paradas')
            .insert({
                ruta_id: idRuta,
                parada_id: paradasIds[i],
                orden: i + 1,
                tiempo_desde_inicio: 0
            })

        if (error) {
            console.log("Error al relacionar ruta con parada", error)
            return
        }
    }
        const todosLosPuntos = []
    
    // Agregar colaboradores
    for (let i = 0; i < puntos.length; i++) {
        todosLosPuntos.push(`${puntos[i].lon} ${puntos[i].lat}`)
    }
    
    // Agregar empresa al final
    todosLosPuntos.push(`${ubicacionEmpresa.lon} ${ubicacionEmpresa.lat}`)
    
    const lineString = `LINESTRING(${todosLosPuntos.join(', ')})`

    // PASO 6: Actualizar la ruta con el trayecto
    const { error: errorUpdate } = await supabase
        .from('rutas')
        .update({ trayecto: lineString })
        .eq('id', idRuta)

    if (errorUpdate) {
        console.log("Error al actualizar trayecto", errorUpdate)
        return
    }

    console.log("Ruta completa guardada exitosamente", idRuta)
    return { success: true, idRuta }


}