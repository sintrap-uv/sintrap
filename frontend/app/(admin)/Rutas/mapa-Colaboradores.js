import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, ScrollView } from "react-native";
import { WebView } from "react-native-webview";
import { useState, useEffect, useRef } from "react";
import { ubicacionColaboradores } from "../../../services/colaboradores";
import { agruparPorCercania } from "../../../services/zonas";
import theme from "../../../constants/theme";
import { guardarRutaCompleta } from "../../../services/rutaServices";
import * as Location from 'expo-location';
import { useToast } from "../../../context/ToastContext";

const MapaColaboradores = () => {

    const [colaboradores, setColaboradores] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [nombreRuta, setNombreRuta] = useState("");
    const [numeroRuta, setNumeroRuta] = useState("");
    const [puntosRuta, setPuntosRuta] = useState([]);
    const [empresaUbicacion, setEmpresaUbicacion] = useState(null);
    const [calculandoRuta, setCalculandoRuta] = useState(false);
    const [webViewListo, setWebViewListo] = useState(false);

    const { showSuccess, showError, showWarning, showInfo } = useToast();
    const webViewRef = useRef(null);
    const modoEdicionRef = useRef(false);

    const cargarDatos = async () => {
        setCargando(true);
        const datos = await ubicacionColaboradores();
        setColaboradores(datos);
        const valores = agruparPorCercania(datos, 0.3);
        setGrupos(valores);
        setEmpresaUbicacion({ lat: 4.0606445663604855, lon: -76.26544561353076 });
        setCargando(false);
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    useEffect(() => {
        if (webViewRef.current) {
            // Usar injectJavaScript para actualizar directamente
            const script = `
            window.editando = ${modoEdicion};
            console.log(" editando actualizado a:", ${modoEdicion});
        `;
            webViewRef.current.injectJavaScript(script);
        }
    }, [modoEdicion]);

    useEffect(() => {
        modoEdicionRef.current = modoEdicion;
        console.log('modoEdicionRef actualizado:', modoEdicionRef.current);
    }, [modoEdicion]);



    const circulosJS = grupos.map(grupo =>
        `L.circle([${grupo.centro.lat}, ${grupo.centro.lon}],
        {radius: 300,
         color: 'green',
         fillColor: '#22C55E',
         fillOpacity: 0.2
        }).addTo(map);`
    ).join("\n");

    const marcadoresJS = colaboradores.map(colaborador =>
        `L.marker([${colaborador.ubicacion_usuario.latidud},
        ${colaborador.ubicacion_usuario.longitud}])
        .bindPopup('${colaborador.nombre || 'Colaborador'}')
        .addTo(map);`
    ).join("\n");

    const marcadorEmpresa = empresaUbicacion ?
        `L.marker([${empresaUbicacion.lat}, ${empresaUbicacion.lon}])
        .bindPopup('🏢 EMPRESA - Punto de inicio')
        .addTo(map);` : '';

    const marcadorVerdeJS = `
    var marcadoresRuta = [];
    
    function agregarMarcadorverde(id, lat, lon) {
        var marcador = L.marker([lat, lon], {
            icon: L.divIcon({
                className: 'punto-marcador',
                iconSize: [12, 12]
            })
        }).addTo(map);
        marcadoresRuta.push({id: id, marcador: marcador});
    }`;

    const dibujarLineaJS = `
    var lineasRuta = [];
    var puntosGuardados = [];
    var lineaActual = null;
    var procesandoClick = false;
    
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
        for(var i = 0; i < marcadoresRuta.length; i++) {
            map.removeLayer(marcadoresRuta[i].marcador);
        }
        marcadoresRuta = [];
        for(var i = 0; i < lineasRuta.length; i++) {
            map.removeLayer(lineasRuta[i]);
        }
        lineasRuta = []; 
        puntoAnteriorLat = ${empresaUbicacion?.lat ?? 4.0863};
        puntoAnteriorLon = ${empresaUbicacion?.lon ?? -76.195};
    }`;

    const centroInicial = grupos.length > 0 ? [grupos[0].centro.lat, grupos[0].centro.lon] : [4.0863, -76.195];

    const ordenarGruposPorCercaniaALaEmpresa = (grupos, empresaUbicacion) => {
        const calcularDistancia = (lat1, lon1, lat2, lon2) => {
            const diferenciaLat = lat2 - lat1;
            const diferenciaLon = lon2 - lon1;
            return Math.sqrt(diferenciaLat * diferenciaLat + diferenciaLon * diferenciaLon);
        };

        const gruposConDistancia = [...grupos];
        for (let i = 0; i < gruposConDistancia.length; i++) {
            const grupo = gruposConDistancia[i];
            grupo.distancia = calcularDistancia(
                grupo.centro.lat, grupo.centro.lon,
                empresaUbicacion.lat, empresaUbicacion.lon
            );
        }
        return gruposConDistancia.sort((a, b) => a.distancia - b.distancia);
    };

    const convertirGruposAPuntos = (gruposOrdenados) => {
        const puntos = [];
        for (let i = 0; i < gruposOrdenados.length; i++) {
            const grupo = gruposOrdenados[i];
            puntos.push({
                id: Date.now() + '_' + i,
                lat: grupo.centro.lat,
                lon: grupo.centro.lon,
                direccion: `Grupo ${i + 1} - ${grupo.colaboradores.length} colaboradores`
            });
        }
        return puntos;
    };

    const generarRutaOptima = (grupos, empresaUbicacion) => {
        if (!grupos || grupos.length === 0) return [];
        if (!empresaUbicacion) return [];
        const gruposOrdenados = ordenarGruposPorCercaniaALaEmpresa(grupos, empresaUbicacion);
        return convertirGruposAPuntos(gruposOrdenados);
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
        .loading-indicator {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0,0,0,0.7);
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 1000;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script> 

    function log(mensaje) {
    window.ReactNativeWebView.postMessage(JSON.stringify({
        tipo: 'log',
        mensaje: mensaje
    }));
    }
    log('mapa de kevin');

    var map = L.map('map').setView([${centroInicial}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);
    
    ${circulosJS}
    ${marcadoresJS}
    ${marcadorEmpresa}
    ${marcadorVerdeJS}
    ${dibujarLineaJS}
    
    var puntoAnteriorLat = ${empresaUbicacion?.lat ?? 4.0863};
    var puntoAnteriorLon = ${empresaUbicacion?.lon ?? -76.195};
    var editando = false;
    var procesandoClick = false;
    
    window.addEventListener('message', function(evento) {
        var datos = JSON.parse(evento.data);

        if (datos.tipo === 'log') {
            log("WebView log:", datos.mensaje);
            return;
        }

        if(datos.tipo === 'setModoEdicion'){
            window.editando = datos.valor;
            editando = datos.valor;
            window.ReactNativeWebView.postMessage(JSON.stringify({
              tipo: 'log',
              mensaje: 'Tu mensaje aquí'
            }));
        }

        if (datos.tipo === 'actualizarLinea') {
           
            for(var i = 0; i < marcadoresRuta.length; i++) {
                map.removeLayer(marcadoresRuta[i].marcador);
            }
            marcadoresRuta = [];
            puntosGuardados= [];
            limpiarLinea();

            for (var i = 0; i < datos.puntos.length; i++) {
                puntosGuardados.push([datos.puntos[i].lat, datos.puntos[i].lon]);
                agregarMarcadorverde(datos.puntos[i].id, datos.puntos[i].lat, datos.puntos[i].lon);
            }
            dibujarLineaConPuntos();

        } else if(datos.tipo === 'eliminarPunto') {
            var indiceParaEliminar = -1;
            for(var i = 0; i < marcadoresRuta.length; i++) {
                if(marcadoresRuta[i].id === datos.id) {
                    indiceParaEliminar = i;
                    map.removeLayer(marcadoresRuta[i].marcador);
                    marcadoresRuta.splice(i, 1);
                    break;
                }
            }
            if(indiceParaEliminar !== -1) {
                puntosGuardados.splice(indiceParaEliminar, 1);
                dibujarLineaConPuntos();
            }
        } else if(datos.tipo === 'limpiarTodo') {
            limpiarTodosLosPuntos();
        }
    });
    
    map.on('click', function(e) {

        if (!editando) {
        log(' Modo edición no activo, ignoro clic');
        return;
        }
        if (procesandoClick) {
            log('Ya se está procesando un punto, espera...');
            window.ReactNativeWebView.postMessage(JSON.stringify({
                tipo: 'error',
                mensaje: 'Espera a que termine el punto anterior'
            }));
            return;
        }
        
        procesandoClick = true;
        var lat = e.latlng.lat;
        var lon = e.latlng.lng;
        
        log('Click en mapa - lat:', lat, 'lon:', lon);
        log('Puntos guardados:', puntosGuardados.length);
        log('Punto anterior - lat:', puntoAnteriorLat, 'lon:', puntoAnteriorLon);
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
            tipo: 'loading',
            estado: true
        }));
        
        if (puntosGuardados.length === 0) {
            puntoAnteriorLat = ${empresaUbicacion?.lat ?? 4.0863};
            puntoAnteriorLon = ${empresaUbicacion?.lon ?? -76.195};
            log('Primer punto - usando empresa como origen');
        }
        
        // Obtener coordenada en calle
        fetch('https://router.project-osrm.org/nearest/v1/driving/' + lon + ',' + lat)
            .then(function(respuesta) {
                if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
                return respuesta.json();
            })
            .then(function(datos) {
                if (!datos.waypoints || datos.waypoints.length === 0) {
                    throw new Error('No se encontró punto cercano');
                }
                var coordenadas = datos.waypoints[0].location;
                var callelon = coordenadas[0];
                var calleLat = coordenadas[1];
                log('Coordenada en calle:', calleLat, callelon);
                
                var url = 'https://router.project-osrm.org/route/v1/driving/' + puntoAnteriorLon + ',' + puntoAnteriorLat + ';' + callelon + ',' + calleLat + '?geometries=geojson';
            
                return fetch(url).then(function(r) { 
                    if (!r.ok) throw new Error('HTTP ' + r.status);
                    return r.json(); 
                }).then(function(ruta) {
                    return { ruta, calleLat, callelon };
                });
            })
            .then(function(data) {
                var ruta = data.ruta;
                var calleLat = data.calleLat;
                var callelon = data.callelon;
                
                if (ruta.routes && ruta.routes.length > 0) {
                    var puntos = ruta.routes[0].geometry.coordinates;
                    var puntosLeaflet = puntos.map(function(p) { 
                        return [p[1], p[0]]; 
                    });
                    L.polyline(puntosLeaflet, {color: '#22C55E', weight: 4}).addTo(map);
                    log('Ruta dibujada exitosamente');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        tipo: 'trazoExitoso',
                        mensaje: 'Ruta dibujada correctamente'
                    }));
                } else {
                    log('No se encontró ruta');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        tipo: 'error',
                        mensaje: 'No se pudo calcular la ruta'
                    }));
                    // Fallback: línea recta
                    var puntosLineaRecta = [[puntoAnteriorLat, puntoAnteriorLon], [calleLat, callelon]];
                    L.polyline(puntosLineaRecta, {color: '#22C55E', weight: 4, dashArray: '5, 5'}).addTo(map);
                    log('Usando línea recta como fallback');
                }
                
                puntoAnteriorLat = calleLat;
                puntoAnteriorLon = callelon;
                log('Nuevo punto anterior:', puntoAnteriorLat, puntoAnteriorLon);
                
                var nuevoId = Date.now();
                agregarMarcadorverde(nuevoId, calleLat, callelon);
                puntosGuardados.push([calleLat, callelon]);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    id: nuevoId,
                    lat: calleLat,
                    lon: callelon
                }));
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    tipo: 'loading',
                    estado: false
                }));
                procesandoClick = false;
                log('Punto agregado correctamente');
            })
            .catch(function(error) {
                log('ERROR al calcular ruta:', error);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    tipo: 'error',
                    mensaje: 'Error al calcular ruta: ' + error.message
                }));
                
                // Fallback: agregar punto sin ruta
                var nuevoId = Date.now();
                agregarMarcadorverde(nuevoId, lat, lon);
                agregarPuntoLinea(lat, lon);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    id: nuevoId,
                    lat: lat,
                    lon: lon
                }));
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    tipo: 'loading',
                    estado: false
                }));
                procesandoClick = false;
                log('Punto agregado sin ruta (fallback)');
            });
    });
    
    log('Mapa listo y configurado');
    </script>
</body>
</html>`;

    const T = theme.lightMode;

    const handleRutaOptima = () => {
        const puntosOptimos = generarRutaOptima(grupos, empresaUbicacion);
        if (puntosOptimos.length === 0) {
            showWarning("No se pudo generar la ruta óptima");
            return;
        }
        setPuntosRuta(puntosOptimos);
        const puntosParaWebView = puntosOptimos.map(p => ({
            lat: p.lat,
            lon: p.lon,
            id: p.id
        }));
        webViewRef.current?.postMessage(JSON.stringify({
            tipo: 'actualizarLinea',
            puntos: puntosParaWebView
        }));
        setModoEdicion(true);
        showSuccess(`Ruta óptima generada con ${puntosOptimos.length} puntos`);
    };

    const eliminarPunto = (id) => {
        const nuevosPuntos = puntosRuta.filter(punto => punto.id !== id);
        setPuntosRuta(nuevosPuntos);

        // Redibujar completamente la línea con los puntos restantes
        const puntosParaWebView = nuevosPuntos.map(p => ({
            lat: p.lat,
            lon: p.lon,
            id: p.id
        }));
        console.log("🗑️ Eliminando punto, nuevos puntos:", nuevosPuntos.length);
        webViewRef.current?.postMessage(JSON.stringify({
            tipo: 'actualizarLinea',
            puntos: puntosParaWebView
        }));

        showInfo('Punto eliminado');
    };

    return (
        <View style={[styles.mapaContenedor, { backgroundColor: T.background }]}>
            {cargando ? (
                <View style={styles.contenedor}>
                    <ActivityIndicator size={"large"} color={T.Button.primary.background} />
                    <Text style={[styles.textoCarga, { color: T.text.secondary }]}>Cargando colaboradores...</Text>
                </View>
            ) : (
                <View style={styles.mapaContenedor}>
                    <View style={[styles.headerInfo, { backgroundColor: T.cards.background, borderBottomColor: T.cards.border }]}>
                        <Text style={[styles.gruposTexto, { color: T.text.primary }]}>
                            Grupos encontrados:
                            <Text style={{ color: T.text.routName, fontWeight: 'bold' }}> {grupos.length}</Text>
                        </Text>
                        <View style={styles.botonesContainer}>
                            <TouchableOpacity
                                style={[styles.botonCrearRuta, { backgroundColor: T.Button.primary.background }]}
                                onPress={() => {
                                    setModoEdicion(true);
                                    showInfo('Modo edición activado - Toca el mapa para agregar puntos');
                                }}>
                                <Text style={[styles.textoBotonCrear, { color: T.Button.primary.Text }]}>Crear ruta</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.botonRutaOptima, { backgroundColor: T.Button.secondary.background, borderColor: T.Button.secondary.border }]}
                                onPress={handleRutaOptima}>
                                <Text style={[styles.textoBotonCrear, { color: T.Button.secondary.text }]}>Ruta óptima</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.mapaWrapper}>
                        <WebView
                            ref={webViewRef}
                            source={{ html: htmlMapa }}
                            onLoad={() => {
                                setWebViewListo(true);
                                // Enviar el estado actual apenas cargue
                                setTimeout(() => {
                                    webViewRef.current?.postMessage(JSON.stringify({
                                        tipo: 'setModoEdicion',
                                        valor: modoEdicion
                                    }));
                                }, 500);

                            }}
                            onMessage={(event) => {
                                const data = event.nativeEvent.data;
                                try {
                                    const mensaje = JSON.parse(data);
                                    console.log("Mensaje del mapa:", mensaje);

                                    if (mensaje.tipo === 'loading') {
                                        setCalculandoRuta(mensaje.estado);
                                        return;
                                    }
                                    if (mensaje.tipo === 'error') {
                                        console.log(mensaje.mensaje);
                                        showError(mensaje.mensaje);
                                        return;
                                    }
                                    if (mensaje.tipo === 'trazoExitoso') {
                                        console.log(mensaje.mensaje);
                                        return;
                                    }
                                    if (modoEdicionRef.current && mensaje.id && mensaje.lat && mensaje.lon) {
                                        const nuevoPunto = {
                                            id: mensaje.id,
                                            lat: mensaje.lat,
                                            lon: mensaje.lon
                                        };
                                        setPuntosRuta(prev => [...prev, nuevoPunto]);
                                        console.log("➕ Punto agregado:", nuevoPunto);
                                        showSuccess('Punto agregado correctamente');
                                    }
                                } catch (e) {
                                    console.log("📨 Mensaje no JSON:", data);
                                }
                            }}
                        />
                        {calculandoRuta && (
                            <View style={styles.loadingOverlay}>
                                <ActivityIndicator size="large" color="#22C55E" />
                                <Text style={styles.loadingText}>Calculando ruta...</Text>
                            </View>
                        )}
                    </View>

                    {modoEdicion && (
                        <View style={[styles.panelCrearRuta, { backgroundColor: T.cards.background, borderTopColor: T.cards.border }]}>
                            <View style={styles.panelHeader}>
                                <Text style={[styles.panelTitulo, { color: T.text.primary }]}>✏️ Modo edición activado</Text>
                                <TouchableOpacity onPress={() => setModoEdicion(false)}>
                                    <Text style={[styles.cerrarPanel, { color: T.icon.error }]}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: T.input.background,
                                        borderColor: T.input.border,
                                        color: T.input.text
                                    }]}
                                    value={nombreRuta}
                                    onChangeText={setNombreRuta}
                                    placeholder="Nombre de la ruta"
                                    placeholderTextColor={T.input.placeholder}
                                />
                                <TextInput
                                    style={[styles.input, {
                                        backgroundColor: T.input.background,
                                        borderColor: T.input.border,
                                        color: T.input.text
                                    }]}
                                    value={numeroRuta}
                                    onChangeText={setNumeroRuta}
                                    placeholder="Número de ruta"
                                    placeholderTextColor={T.input.placeholder}
                                    keyboardType="numeric"
                                />
                            </View>

                            <View>
                                <Text style={{ color: T.text.primary, marginBottom: 8, fontWeight: 'bold' }}>
                                    Puntos seleccionados: {puntosRuta.length}
                                </Text>
                                <ScrollView style={{ maxHeight: 140 }}>
                                    {puntosRuta.map((punto, indice) => (
                                        <View key={punto.id} style={styles.puntoItem}>
                                            <Text style={{ color: T.text.secondary, fontSize: 12 }}>
                                                {indice + 1}. {punto.direccion || `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`}
                                            </Text>
                                            <TouchableOpacity onPress={() => eliminarPunto(punto.id)}>
                                                <Text style={styles.iconoBasura}>🗑️</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity
                                    style={styles.botonLimpiar}
                                    onPress={() => {
                                        if (puntosRuta.length === 0) {
                                            showInfo('No hay puntos para limpiar');
                                            return;
                                        }
                                        setPuntosRuta([]);
                                        webViewRef.current?.postMessage(JSON.stringify({ tipo: 'limpiarTodo' }));
                                        showInfo('Todos los puntos han sido eliminados');
                                    }}>
                                    <Text style={styles.textoLimpiar}>🗑️ Limpiar todos los puntos</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity
                                style={[styles.botonGuardar, { backgroundColor: T.Button.primary.background }]}
                                onPress={async () => {
                                    if (!nombreRuta.trim()) {
                                        showError("El nombre de la ruta es obligatorio");
                                        return;
                                    }
                                    if (puntosRuta.length === 0) {
                                        showWarning('Debes seleccionar al menos un punto');
                                        return;
                                    }
                                    try {
                                        await guardarRutaCompleta(nombreRuta, numeroRuta, puntosRuta, empresaUbicacion);
                                        showSuccess(`Ruta "${nombreRuta}" guardada exitosamente`);
                                        setModoEdicion(false);
                                        setNombreRuta("");
                                        setNumeroRuta("");
                                        setPuntosRuta([]);
                                    } catch (error) {
                                        showError('Error al guardar la ruta');
                                    }
                                }}>
                                <Text style={[styles.textoGuardar, { color: T.Button.primary.Text }]}>💾 Guardar Ruta</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
};

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
        position: 'relative',
    },
    headerInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    botonesContainer: {
        flexDirection: 'row',
        gap: 8,
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
    botonRutaOptima: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: theme.lightMode.Button.primary.borderRadius,
        borderWidth: 1,
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
        marginTop: 12,
    },
    textoGuardar: {
        fontSize: theme.lightMode.tipografia.fontSize.card,
        fontFamily: theme.lightMode.tipografia.fonts.bold,
    },
    botonLimpiar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FEE2E2',
    },
    textoLimpiar: {
        color: '#DC2626',
        fontSize: 14,
        fontWeight: '500',
    },
    puntoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    iconoBasura: {
        color: 'red',
        fontSize: 16,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingText: {
        color: 'white',
        fontSize: 16,
        marginTop: 10,
        fontWeight: 'bold',
    },
});

export default MapaColaboradores;