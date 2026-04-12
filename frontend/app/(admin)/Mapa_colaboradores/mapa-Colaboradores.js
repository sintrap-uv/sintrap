// MapaColaboradores.jsx
import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import theme from "../../../constants/theme";
import { useMapaColaboradores } from "./useMapaColaboradores";
import { generarHtmlMapa } from "./mapaHTML";
import PanelRuta from "./PanelRuta";
import { styles } from "./MapaColaboradores.styles";

const T = theme.lightMode;

const MapaColaboradores = () => {
    const {
        colaboradores, grupos, cargando,
        modoEdicion, setModoEdicion,
        nombreRuta, setNombreRuta,
        numeroRuta, setNumeroRuta,
        puntosRuta, empresaUbicacion, calculandoRuta,
        panelVisible, setPanelVisible,
        webViewRef, onMensajeMapa,
        handleRutaOptima, eliminarPunto, limpiarPuntos, guardarRuta,
        showInfo,
    } = useMapaColaboradores();

    const circulosJS = grupos.map(g =>
        `L.circle([${g.centro.lat}, ${g.centro.lon}], { radius: 300, color: 'green', fillColor: '#22C55E', fillOpacity: 0.2 }).addTo(map);`
    ).join("\n");

    const marcadoresJS = colaboradores.map(c =>
        `L.marker([${c.ubicacion_usuario.latidud}, ${c.ubicacion_usuario.longitud}]).bindPopup('${c.nombre || 'Colaborador'}').addTo(map);`
    ).join("\n");

    const marcadorEmpresa = empresaUbicacion
        ? `L.marker([${empresaUbicacion.lat}, ${empresaUbicacion.lon}]).bindPopup('Punto de inicio').addTo(map);`
        : '';

    const centroInicial = grupos.length > 0
        ? [grupos[0].centro.lat, grupos[0].centro.lon]
        : [4.0863, -76.195];

    const htmlMapa = generarHtmlMapa({ centroInicial, circulosJS, marcadoresJS, marcadorEmpresa, empresaUbicacion });

    if (cargando) return (
        <View style={[styles.contenedor, { backgroundColor: T.background }]}>
            <ActivityIndicator size="large" color={T.Button.primary.background} />
            <Text style={[styles.textoCarga, { color: T.text.secondary }]}>Cargando colaboradores...</Text>
        </View>
    );

    return (
        <View style={[styles.mapaContenedor, { backgroundColor: T.background }]}>
            <View style={styles.mapaWrapper}>
                <WebView
                    ref={webViewRef}
                    source={{ html: htmlMapa }}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    originWhitelist={['*']}
                    onLoad={() => {
                        setTimeout(() => {
                            webViewRef.current?.postMessage(JSON.stringify({
                                tipo: 'setModoEdicion',
                                valor: modoEdicion
                            }));
                        }, 500);
                    }}
                    onMessage={onMensajeMapa}
                />
                <View style={styles.botonesFlotantes}>
                    <View style={styles.botonesContainer}>
                        <TouchableOpacity
                            style={[styles.botonFlotanteCrear, { backgroundColor: T.Button.primary.background }]}
                            onPress={() => { setModoEdicion(true); showInfo('Modo edición activado - Toca el mapa para agregar puntos'); }}>
                            <Text style={{ color: T.Button.primary.Text, fontWeight: 'bold' }}>Crear ruta</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.botonFlotanteOptima, { backgroundColor: T.Button.secondary.background, borderWidth: 1, borderColor: T.Button.secondary.border }]}
                            onPress={handleRutaOptima}>
                            <Text style={{ color: T.Button.secondary.text }}>Ruta óptima</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {calculandoRuta && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#22C55E" />
                        <Text style={styles.loadingText}>Calculando ruta...</Text>
                    </View>
                )}
            </View>

            {modoEdicion && panelVisible && (
                <PanelRuta
                    nombreRuta={nombreRuta} setNombreRuta={setNombreRuta}
                    numeroRuta={numeroRuta} setNumeroRuta={setNumeroRuta}
                    puntosRuta={puntosRuta} eliminarPunto={eliminarPunto}
                    limpiarPuntos={limpiarPuntos} guardarRuta={guardarRuta}
                    setPanelVisible={setPanelVisible} setModoEdicion={setModoEdicion}
                />
            )}

            {modoEdicion && !panelVisible && (
                <TouchableOpacity style={styles.botonMostrarPanel} onPress={() => setPanelVisible(true)}>
                    <Text style={styles.textoMostrarPanel}>Mostrar panel</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default MapaColaboradores;