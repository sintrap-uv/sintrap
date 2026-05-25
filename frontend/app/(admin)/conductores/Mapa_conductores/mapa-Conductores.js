// MapaColaboradores.jsx
import { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Header from "../../../../components/Header";
import {
    View, Text, ActivityIndicator,
    TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard
} from "react-native"
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import theme from "../../../../constants/theme";
import { useMapaColaboradores } from "./useMapaConductores";
import { generarHtmlMapa } from "./mapaHTML";
import PanelRuta from "./PanelRuta/panelOpciones";
import { styles } from "./MapaConductores.styles";

const T = theme.lightMode;

const MapaColaboradores = () => {
    const router = useRouter();
    const params = useLocalSearchParams();
    const returnTo = params.returnTo;
    const vieneDeAccionesRapidas = returnTo === "acciones_rapidas";

    const [paso, setPaso] = useState(1);
    const [panelColapsado, setPanelColapsado] = useState(false);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    // Función para volver al home (cuando viene de acciones rápidas)
    const handleBackToHome = () => {
        router.replace("/home");
    };

    // Función para ir al perfil (cuando viene de la barra de navegación)
    const handleGoToProfile = () => {
        router.push("/home?tab=perfil");
    };

    useEffect(() => {
        const mostrar = Keyboard.addListener('keyboardDidShow', (e) => {
            setKeyboardHeight(e.endCoordinates.height);
        });
        const ocultar = Keyboard.addListener('keyboardDidHide', () => {
            setKeyboardHeight(0);
        });
        return () => { mostrar.remove(); ocultar.remove(); };
    }, []);

    const {
        colaboradores, grupos, cargando,
        modoEdicion, setModoEdicion,
        nombreRuta, setNombreRuta,
        numeroRuta, setNumeroRuta,
        puntosRuta, empresaUbicacion, calculandoRuta,
        panelVisible, setPanelVisible,
        webViewRef, onMensajeMapa,
        handleRutaOptima, eliminarPunto, limpiarPuntos, guardarRuta,
        showInfo, showError, showWarning,
        conductores, vehiculos,
        conductorId, handleConductorChange,
        vehiculoId, setVehiculoId,
        horaInicio,
        horaFin, handleHoraFinChange,
        diasSeleccionados, handleDiasChange,
        sincronizarModoMapa,
        puntosParada,
        eliminarParada,
        limpiarParadas,
        turnoId, setTurnoId,
        turnos,
        handleHoraInicioChange,
        verificarNumeroRuta,
        verificarEstadoVehiculo,
        rutasExistentes,
        verificarConflictoHorarioVehiculo,
        guardando
    } = useMapaColaboradores();

    const handleSetModoEdicion = (valor) => {
        if (!valor) setPaso(1);
        setModoEdicion(valor);
    };

    const circulosJS = grupos.map(g =>
        `L.circle([${g.centro.lat}, ${g.centro.lon}], { radius: 300, color: 'green', fillColor: '#22C55E', fillOpacity: 0.2 }).addTo(map);`
    ).join("\n");

    const marcadoresJS = colaboradores.map(c =>
        `L.marker([${c.latitud}, ${c.longitud}]).bindPopup('${c.profiles?.nombre || 'Colaborador'}').addTo(map);`
    ).join("\n");

    const marcadorEmpresa = empresaUbicacion
        ? `L.marker([${empresaUbicacion.lat}, ${empresaUbicacion.lon}]).bindPopup('Punto de inicio').addTo(map);`
        : '';

    const centroInicial = grupos.length > 0
        ? [grupos[0].centro.lat, grupos[0].centro.lon]
        : [4.0863, -76.195];

    const htmlMapa = generarHtmlMapa({ centroInicial, circulosJS, marcadoresJS, marcadorEmpresa, empresaUbicacion, rutasExistentes });

    if (cargando) return (
        <View style={[styles.contenedor, { backgroundColor: T.background }]}>
            <ActivityIndicator size="large" color={T.Button.primary.background} />
            <Text style={[styles.textoCarga, { color: T.text.secondary }]}>Cargando colaboradores...</Text>
        </View>
    );

    const esModoMapa = paso === 3 || paso === 4;
    const flexMapa = 1;

    return (
        <View style={[styles.mapaContenedor, { backgroundColor: T.background }]}>
            {/* Header condicional según el origen */}
            {vieneDeAccionesRapidas ? (
                // Desde acciones rápidas: solo flecha que lleva al home
                <Header
                    titulo="Mapa de colaboradores"
                    subtitulo="Gestión de rutas"
                    showBack={true}
                    onBack={handleBackToHome}
                />
            ) : (
                // Desde barra de navegación: solo engranaje que lleva al perfil
                <Header
                    titulo="Mapa de colaboradores"
                    subtitulo="Gestión de rutas"
                    showBack={false}
                    iconoDerecha={
                        <TouchableOpacity onPress={handleGoToProfile}>
                            <Ionicons name="settings-outline" size={36} color="#fff" />
                        </TouchableOpacity>
                    }
                />
            )}

            {/* Mapa — se encoge cuando aparece el teclado */}
            <View style={{ flex: flexMapa }}>
                <WebView
                    key={colaboradores.length}
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
                        {!modoEdicion && (
                            <TouchableOpacity
                                style={[styles.botonFlotanteCrear, { backgroundColor: T.Button.primary.background }]}
                                onPress={() => {
                                    setModoEdicion(true);
                                    setPanelVisible(true);
                                    showInfo('Completa los pasos para trazar tu ruta');
                                }}>
                                <Text style={{ color: T.Button.primary.Text, fontWeight: 'bold' }}>Registrar ruta</Text>
                            </TouchableOpacity>
                        )}
                        {!modoEdicion && (
                            <TouchableOpacity
                                style={[styles.botonFlotanteOptima, { backgroundColor: T.Button.secondary.background, borderWidth: 1, borderColor: T.Button.secondary.border }]}
                                onPress={handleRutaOptima}>
                                <Text style={{ color: T.Button.secondary.text }}>Ruta óptima</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {calculandoRuta && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#22C55E" />
                        <Text style={styles.loadingText}>Calculando ruta...</Text>
                    </View>
                )}
            </View>

            {/* Panel — sube cuando aparece el teclado */}
            {modoEdicion && panelVisible && (
                <View style={{
                    position: 'absolute',
                    bottom: esModoMapa ? 0 : keyboardHeight,
                    left: 0,
                    right: 0,
                }}>
                    <PanelRuta
                        nombreRuta={nombreRuta} setNombreRuta={setNombreRuta}
                        numeroRuta={numeroRuta} setNumeroRuta={setNumeroRuta}
                        puntosRuta={puntosRuta} eliminarPunto={eliminarPunto}
                        limpiarPuntos={limpiarPuntos} guardarRuta={guardarRuta}
                        setPanelVisible={setPanelVisible} setModoEdicion={setModoEdicion}
                        conductores={conductores} vehiculos={vehiculos}
                        conductorId={conductorId} handleConductorChange={handleConductorChange}
                        vehiculoId={vehiculoId} setVehiculoId={setVehiculoId}
                        horaInicio={horaInicio}
                        showError={showError} showWarning={showWarning}
                        panelColapsado={panelColapsado}
                        setPanelColapsado={setPanelColapsado}
                        sincronizarModoMapa={sincronizarModoMapa}
                        paso={paso}
                        setPaso={setPaso}
                        puntosParada={puntosParada}
                        eliminarParada={eliminarParada}
                        limpiarParadas={limpiarParadas}
                        turnoId={turnoId} setTurnoId={setTurnoId}
                        turnos={turnos}
                        diasSeleccionados={diasSeleccionados}
                        handleDiasChange={handleDiasChange}
                        horaFin={horaFin}
                        handleHoraFinChange={handleHoraFinChange}
                        handleHoraInicioChange={handleHoraInicioChange}
                        verificarNumeroRuta={verificarNumeroRuta}
                        verificarEstadoVehiculo={verificarEstadoVehiculo}
                        verificarConflictoHorarioVehiculo={verificarConflictoHorarioVehiculo}
                        guardando={guardando}
                    />
                </View>
            )}

            {modoEdicion && !panelVisible && !esModoMapa && (
                <TouchableOpacity style={styles.botonMostrarPanel} onPress={() => setPanelVisible(true)}>
                    <Text style={styles.textoMostrarPanel}>Mostrar panel</Text>
                </TouchableOpacity>
            )}
            {guardando && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#22C55E" />
                    <Text style={styles.loadingText}>Guardando ruta...</Text>
                </View>
            )}
        </View>
    );
};

export default MapaColaboradores;
