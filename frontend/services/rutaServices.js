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

export async function guardarRutaCompleta(nombre, numero_ruta, puntos, ubicacionEmpresa) {
    try {
        // Validaciones
        if (!nombre || nombre.trim() === "") {
            return { success: false, error: "El nombre de la ruta es obligatorio" };
        }

        if (!puntos || puntos.length === 0) {
            return { success: false, error: "No hay puntos para guardar" };
        }

        if (!ubicacionEmpresa || !ubicacionEmpresa.lat || !ubicacionEmpresa.lon) {
            return { success: false, error: "Ubicación de empresa no válida" };
        }

        // 1. Construir el LINESTRING para el trayecto
        // Formato: LINESTRING(lon lat, lon lat, ...)
        const todosLosPuntos = [];

        // Punto de inicio: Empresa
        todosLosPuntos.push(`${ubicacionEmpresa.lon} ${ubicacionEmpresa.lat}`);

        // Puntos intermedios: Colaboradores en orden
        for (let i = 0; i < puntos.length; i++) {
            todosLosPuntos.push(`${puntos[i].lon} ${puntos[i].lat}`);
        }

        // Punto de retorno: Empresa (opcional, puedes quitarlo si no quieres)
        todosLosPuntos.push(`${ubicacionEmpresa.lon} ${ubicacionEmpresa.lat}`);

        const lineString = `LINESTRING(${todosLosPuntos.join(', ')})`;

        console.log("📐 Trayecto generado:", lineString);

        // 2. Crear la ruta con el trayecto
        const resultadoCrearRuta = await crearRuta(nombre, numero_ruta, lineString);

        if (resultadoCrearRuta.error) {
            console.log("❌ Error al crear ruta", resultadoCrearRuta.error);
            return { success: false, error: resultadoCrearRuta.error };
        }

        const idRuta = resultadoCrearRuta.data.id;
        console.log("✅ Ruta creada con ID:", idRuta);

        // 3. Crear paradas para cada punto seleccionado
        const paradasIds = [];

        for (let i = 0; i < puntos.length; i++) {
            const punto = puntos[i];
            const nombreParada = punto.direccion || `Punto ${i + 1}`;

            const resultadoParada = await crearRutaParadas(
                nombreParada,
                punto.lat,
                punto.lon,
                "Colaborador"
            );

            if (resultadoParada.error) {
                console.log(`❌ Error al crear parada ${i + 1}`, resultadoParada.error);
                return { success: false, error: resultadoParada.error };
            }

            paradasIds.push(resultadoParada.data.id);
            console.log(`✅ Parada ${i + 1} creada con ID:`, resultadoParada.data.id);
        }

        // 4. Crear la parada de la empresa
        const resultadoParadaEmpresa = await crearRutaParadas(
            "Empresa - Punto de Inicio",
            ubicacionEmpresa.lat,
            ubicacionEmpresa.lon,
            "Punto de inicio y fin de la ruta"
        );

        if (resultadoParadaEmpresa.error) {
            console.log("❌ Error al crear parada de empresa", resultadoParadaEmpresa.error);
            return { success: false, error: resultadoParadaEmpresa.error };
        }

        const idParadaEmpresa = resultadoParadaEmpresa.data.id;
        console.log("✅ Parada de empresa creada con ID:", idParadaEmpresa);

        // 5. Relacionar ruta con paradas (colaboradores)
        for (let i = 0; i < paradasIds.length; i++) {
            const { error } = await supabase
                .from('ruta_paradas')
                .insert({
                    ruta_id: idRuta,
                    parada_id: paradasIds[i],
                    orden: i + 1,
                    tiempo_desde_inicio: 0 // Puedes calcular esto después
                });

            if (error) {
                console.log(`❌ Error al relacionar ruta con parada ${i + 1}`, error);
                return { success: false, error };
            }
            console.log(`✅ Relación ruta-parada ${i + 1} creada`);
        }

        // 6. Relacionar la empresa (como última parada)
        const { error: errorEmpresaRelacion } = await supabase
            .from('ruta_paradas')
            .insert({
                ruta_id: idRuta,
                parada_id: idParadaEmpresa,
                orden: paradasIds.length + 1,
                tiempo_desde_inicio: 0
            });

        if (errorEmpresaRelacion) {
            console.log("❌ Error al relacionar empresa con ruta", errorEmpresaRelacion);
            return { success: false, error: errorEmpresaRelacion };
        }
        console.log("✅ Relación empresa-ruta creada");

        console.log("🎉 Ruta completa guardada exitosamente con ID:", idRuta);
        return { success: true, idRuta, message: "Ruta guardada correctamente" };

    } catch (error) {
        console.error("❌ Error inesperado al guardar la ruta:", error);
        return { success: false, error: error.message };
    }
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
