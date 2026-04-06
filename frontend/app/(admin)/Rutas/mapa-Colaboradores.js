import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from "react-native";
import { WebView } from "react-native-webview";
import { useState, useEffect, useRef } from "react";
import { ubicacionColaboradores } from "../../../services/colaboradores";
import { agruparPorCercania } from "../../../services/zonas";
import theme from "../../../constants/theme";
import { guardarRutaCompleta } from "../../../services/rutaServices";
import * as Location from 'expo-location';



const MapaColaboradores = () => {

    const [colaboradores, setColaboradores] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [nombreRuta, setNombreRuta] = useState("");
    const [numeroRuta, setNumeroRuta] = useState("");
    const [puntosRuta, setPuntosRuta] = useState([]);
    const [pasoActual, setPasoActual] = useState(1);
    const [empresaUbicacion, setEmpresaUbicacion] = useState(null);

    const webViewRef = useRef(null);

    const cargarDatos = async () => {

        setCargando(true);
        const datos = await ubicacionColaboradores();

        setColaboradores(datos);
        const valores = agruparPorCercania(datos, 0.3);
        setGrupos(valores)

        //cargamos los datos defaul por ahora de la empresa
        setEmpresaUbicacion({ lat: 4.0606445663604855, lon: -76.26544561353076 })

        setCargando(false);
    }

    useEffect(() => {
        cargarDatos();
    }, []);
    const convertirCoordenadaADireccion = async (lat, lon) => {
        try {
            const direcciones = await Location.reverseGeocodeAsync({
                latitude: lat,
                longitude: lon
            });

            if (direcciones.length > 0) {
                const dir = direcciones[0];
                // Construir dirección legible
                const partes = [];
                if (dir.street) partes.push(dir.street);
                if (dir.streetNumber) partes.push(dir.streetNumber);
                if (dir.district) partes.push(dir.district);
                if (dir.city) partes.push(dir.city);

                return partes.length > 0 ? partes.join(', ') : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            }
            return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        } catch (error) {
            console.log("Error reverse geocoding:", error);
            return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
        }
    };

    const circulosJS = grupos.map(grupo =>
        `L.circle([${grupo.centro.lat}, ${grupo.centro.lon}],
        {radius : 300,
         color:'green',
         fillColor: '#22C55E',
         fillOpacity: 0.2
        }).addTo(map);`
    ).join("\n");

    const marcadoresJS = colaboradores.map(colaborador =>
        `L.marker([${colaborador.ubicacion_usuario.latidud},
        ${colaborador.ubicacion_usuario.longitud}])
        .bindPopup('${colaborador.nombre || 'Colaborador'}')
        .addTo(map);
        ` ).join("\n");

    const marcadorEmpresa = empresaUbicacion ?
        `L.marker([${empresaUbicacion.lat}, ${empresaUbicacion.lon}])
        .bindPopup('EMPRESA - Punto final')
        .addTo(map);
    `: '';

    const marcadorVerdeJS = `
   function agregarMarcadorverde(lat, lon){
    var marcador = L.marker([lat,lon],{
        icon:L.divIcon({
            className: 'punto-marcador',
            iconSize: [12, 12]
        })
    }).addTo(map);
   }
    `;
    const dibujarLineaJS = `
    var puntosGuardados = [];
    var lineaActual = null;
    
    function limpiarLinea() {
        if (lineaActual) {
            map.removeLayer(lineaActual);
            lineaActual = null;
        }
    }
    
    function dibujarLineaConPuntos() {
        limpiarLinea();
        if (puntosGuardados.length > 1) {
            lineaActual = L.polyline(puntosGuardados, {
                color: '#22C55E',
                weight: 4,
                opacity: 0.8
            }).addTo(map);
        }
    }
    
    function agregarPuntoLinea(lat, lon) {
        puntosGuardados.push([lat, lon]);
        dibujarLineaConPuntos();
    }
    
    function limpiarTodosLosPuntos() {
        puntosGuardados = [];
        limpiarLinea();
        // Aquí también deberías limpiar los marcadores verdes
    }
`;

    const centroInicial =
        grupos.length > 0 ? [grupos[0].centro.lat, grupos[0].centro.lon]
            :
            [4.0863, -76.195]

    const ordenarGruposPorCercaniaALaEmpresa = (grupos, empresaUbicacion) => {

        // Función para calcular distancia entre dos puntos (fórmula de distancia euclidiana)
        const calcularDistancia = (lat1, lon1, lat2, lon2) => {
            const diferenciaLat = lat2 - lat1;
            const diferenciaLon = lon2 - lon1;
            return Math.sqrt(diferenciaLat * diferenciaLat + diferenciaLon * diferenciaLon);
        };
        // Crear una copia del array para no modificar el original
        const gruposConDistancia = [...grupos];

        // Calcular distancia de cada grupo a la empresa
        for (let i = 0; i < gruposConDistancia.length; i++) {
            const grupo = gruposConDistancia[i];
            const distancia = calcularDistancia(
                grupo.centro.lat,
                grupo.centro.lon,
                empresaUbicacion.lat,
                empresaUbicacion.lon
            );
            grupo.distancia = distancia; // Guardar distancia para ordenar
        }

        // Ordenar los grupos por distancia (menor a mayor)
        gruposConDistancia.sort((a, b) => a.distancia - b.distancia);

        return gruposConDistancia;
    };
    const convertirGruposAPuntos = (gruposOrdenados) => {
        const puntos = [];

        for (let i = 0; i < gruposOrdenados.length; i++) {
            const grupo = gruposOrdenados[i];
            puntos.push({
                lat: grupo.centro.lat,
                lon: grupo.centro.lon,
                direccion: `Grupo ${i + 1} - ${grupo.colaboradores.length} colaboradores`
            });
        }

        return puntos;
    };
    const generarRutaOptima = (grupos, empresaUbicacion) => {
        if (!grupos || grupos.length === 0) {
            console.log("No hay grupos para generar ruta");
            return [];
        }

        if (!empresaUbicacion) {
            console.log("No hay ubicación de la empresa");
            return [];
        }

        // 1. Ordenar grupos por cercanía a la empresa
        const gruposOrdenados = ordenarGruposPorCercaniaALaEmpresa(grupos, empresaUbicacion);

        // 2. Convertir grupos a puntos
        const puntosRuta = convertirGruposAPuntos(gruposOrdenados);

        console.log(`Ruta óptima generada con ${puntosRuta.length} puntos`);
        return puntosRuta;
    };


    const htmlMapa = `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        #map { width: 100%; height: 100vh; }
        .punto-marcador {
            background: #22C55E;
            border: 2px solid white;
            border-radius: 50%;
            width: 12px;
            height: 12px;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script> 
    var map = L.map('map').setView([${centroInicial}], 15)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);
    
    ${circulosJS}
    ${marcadoresJS}
    ${marcadorEmpresa}
    ${marcadorVerdeJS}
    ${dibujarLineaJS}
    
    // Escuchar mensajes desde React Native
    window.addEventListener('message', function(evento) {
        var datos = JSON.parse(evento.data);
        if (datos.tipo === 'actualizarLinea') {
            puntosGuardados = [];
            for (var i = 0; i < datos.puntos.length; i++) {
                puntosGuardados.push([datos.puntos[i][0], datos.puntos[i][1]]);
                agregarMarcadorverde(datos.puntos[i][0], datos.puntos[i][1]);
            }
            dibujarLineaConPuntos();
        }
    });
    
    map.on('click',function(e) {
        agregarMarcadorverde(e.latlng.lat, e.latlng.lng);
        agregarPuntoLinea(e.latlng.lat, e.latlng.lng);
        window.ReactNativeWebView.postMessage(e.latlng.lat +","+ e.latlng.lng);
    })
</script>
</body>
</html>
`;
    const T = theme.lightMode;

    const handleRutaOptima = () => {
        // Generar puntos óptimos
        const puntosOptimos = generarRutaOptima(grupos, empresaUbicacion);

        if (puntosOptimos.length === 0) {
            alert("No se pudo generar la ruta óptima");
            return;
        }

        // Guardar puntos en el estado
        setPuntosRuta(puntosOptimos);

        // Enviar al WebView para dibujar
        const puntosParaWebView = puntosOptimos.map(p => [p.lat, p.lon]);
        webViewRef.current?.postMessage(JSON.stringify({
            tipo: 'actualizarLinea',
            puntos: puntosParaWebView
        }));

        // Activar modo edición
        setModoEdicion(true);

        console.log("Ruta óptima generada con", puntosOptimos.length, "puntos");
    };

    return (

        <View style={[styles.mapaContenedor, { backgroundColor: T.background }]}>
            {cargando ? (
                <View style={styles.contenedor}>
                    <ActivityIndicator size={"large"} color={T.Button.primary.background} />
                    <Text style={[styles.textoCarga, { color: T.text.secondary }]}>
                        {'Cargando colaboradores'}
                    </Text>
                </View>

            ) : (

                <View style={styles.mapaContenedor}>
                    {/* Header con contador de grupos */}
                    <View style={[styles.headerInfo, { backgroundColor: T.cards.background, borderBottomColor: T.cards.border }]}>

                        <Text style={[styles.gruposTexto, { color: T.text.primary }]}>
                            {'Grupos encontrados: '}
                            <Text style={{ color: T.text.routName, fontWeight: 'bold' }}>
                                {grupos.length}
                            </Text>
                        </Text>

                        <TouchableOpacity style={[styles.botonCrearRuta, { backgroundColor: T.Button.primary.background }]}
                            onPress={() => setModoEdicion(true)}
                        >
                            <Text style={[styles.textoBotonCrear, { color: T.Button.primary.Text }]}>
                                Crear ruta
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.botonRutaOptima, { backgroundColor: T.Button.secondary.background, borderColor: T.Button.secondary.border }]}
                            onPress={handleRutaOptima}
                        >
                            <Text style={[styles.textoBotonCrear, { color: T.Button.secondary.text }]}>
                                Ruta óptima
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Mapa */}
                    <View style={styles.mapaWrapper}>
                        <WebView
                            ref={webViewRef}
                            source={{ html: htmlMapa }}
                            onMessage={async (event) => {
                                if (modoEdicion) {
                                    const coordenada = event.nativeEvent.data;
                                    console.log('corodenada' + event.nativeEvent.data)
                                    const [lat, lon] = coordenada.split(',');
                                    const latNum = parseFloat(lat);
                                    const lonNum = parseFloat(lon);

                                    const direccion = await convertirCoordenadaADireccion(latNum, lonNum);

                                    setPuntosRuta(prev => {
                                        const nuevosPuntos = [...prev, {
                                            lat: latNum,
                                            lon: lonNum,
                                            direccion: direccion

                                        }];

                                        const puntosParaWebView = nuevosPuntos.map(p => [p.lat, p.lon]);
                                        webViewRef.current?.postMessage(JSON.stringify({
                                            tipo: 'actualizarLinea',
                                            puntos: puntosParaWebView
                                        }));
                                        return nuevosPuntos;
                                    });
                                }
                            }}
                        />
                    </View>

                    {/* Panel de edición */}
                    {modoEdicion &&
                        <View style={[styles.panelCrearRuta, { backgroundColor: T.cards.background, borderTopColor: T.cards.border }]}>
                            <View style={styles.panelHeader}>
                                <Text style={[styles.panelTitulo, { color: T.text.primary }]}>
                                    Modo edicion activado
                                </Text>
                                <TouchableOpacity onPress={() => setModoEdicion(false)}>
                                    <Text style={[styles.cerrarPanel, { color: T.icon.error }]}>
                                        x
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: T.input.background,
                                            borderColor: T.input.border,
                                            color: T.input.text
                                        }
                                    ]}
                                    value={nombreRuta}
                                    onChangeText={setNombreRuta}
                                    placeholder="Nombre de la ruta"
                                    placeholderTextColor={T.input.placeholder}
                                />
                                <TextInput
                                    style={[
                                        styles.input,
                                        {
                                            backgroundColor: T.input.background,
                                            borderColor: T.input.border,
                                            color: T.input.text
                                        }
                                    ]}
                                    value={numeroRuta}
                                    onChangeText={setNumeroRuta}
                                    placeholder="Numero de ruta"
                                    placeholderTextColor={T.input.placeholder}
                                    keyboardType="numeric"
                                />
                            </View>

                            {/*contiene todo*/}
                            <View>
                                <Text>Puntos seleccionados : {puntosRuta.length}</Text>
                                {/*Recorremos todos los puntos */}
                                {puntosRuta.map((punto, indice) => (
                                    <Text key={indice} style={{ color: T.text.secondary, fontSize: 12 }}>
                                        {indice + 1}. {punto.direccion || `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`})
                                    </Text>
                                ))}
                                <TouchableOpacity onPress={() => setPuntosRuta([])}>
                                    <Text>Limpiar puntos</Text>
                                </TouchableOpacity>
                            </View>

                            {/*Boton de Guardar */}
                            <TouchableOpacity
                                style={[styles.botonGuardar, { backgroundColor: T.Button.primary.background }]}
                                onPress={async () => {
                                    await guardarRutaCompleta(nombreRuta, numeroRuta, puntosRuta, empresaUbicacion);
                                    setModoEdicion(false);
                                    setNombreRuta("");
                                    setNumeroRuta("");
                                    setPuntosRuta([]);
                                }}
                            >
                                <Text style={[styles.textoGuardar, { color: T.Button.primary.Text }]}>
                                    Guardar
                                </Text>
                            </TouchableOpacity>
                        </View>
                    }
                </View>

            )}
        </View>

    )
}

const T = theme.lightMode;
const styles = StyleSheet.create({
    contenedor: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    textoCarga: {
        marginTop: 12,
        fontSize: theme.lightMode.tipografia.fontSize.card,
        fontFamily: theme.lightMode.tipografia.fonts.regular,
    },
    mapaContenedor: {
        flex: 1,
    },
    mapaWrapper: {
        flex: 1,
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    gruposTexto: {
        fontSize: theme.lightMode.tipografia.fontSize.card,
        fontFamily: theme.lightMode.tipografia.fonts.regular,
    },
    botonCrearRuta: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.lightMode.Button.primary.borderRadius,
    },
    textoBotonCrear: {
        fontSize: theme.lightMode.tipografia.fontSize.card,
        fontFamily: theme.lightMode.tipografia.fonts.medium,
    },
    panelCrearRuta: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        borderTopWidth: 1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    panelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    panelTitulo: {
        fontSize: theme.lightMode.tipografia.fontSize.title,
        fontFamily: theme.lightMode.tipografia.fonts.bold,
    },
    cerrarPanel: {
        fontSize: 20,
        fontWeight: 'bold',
        padding: 4,
    },
    inputContainer: {
        gap: 12,
        marginBottom: 20,
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderRadius: theme.lightMode.input.borderRadius,
        paddingHorizontal: 12,
        fontSize: theme.lightMode.tipografia.fontSize.input,
        fontFamily: theme.lightMode.tipografia.fonts.regular,
    },
    botonGuardar: {
        paddingVertical: 12,
        borderRadius: theme.lightMode.Button.primary.borderRadius,
        alignItems: 'center',
    },
    textoGuardar: {
        fontSize: theme.lightMode.tipografia.fontSize.card,
        fontFamily: theme.lightMode.tipografia.fonts.bold,
    },
    botonRutaOptima: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.lightMode.Button.primary.borderRadius,
    borderWidth: 1,
    marginLeft: 8,
},
});

export default MapaColaboradores;