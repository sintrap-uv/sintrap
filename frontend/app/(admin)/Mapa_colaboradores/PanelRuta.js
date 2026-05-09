// PanelRuta.jsx
import { useState, useRef } from "react";
import {
    View, Text, TextInput, TouchableOpacity,
    ScrollView, StyleSheet, Animated, PanResponder, Keyboard
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import theme from "../../../constants/theme";
import { subscribe } from "expo-router/build/link/linking";

const T = theme.lightMode;

const PASOS = [
    { numero: 1, titulo: "Información de la ruta", subtitulo: "Nombre y número" },
    { numero: 2, titulo: "Recursos", subtitulo: "Conductor, vehículo y horario" },
    { numero: 3, titulo: "Trazar ruta", subtitulo: "Toca el mapa para agregar puntos" },
    { numero: 4, titulo: "Escoge las paradas del bus", subtitulo: "Toca el mapa para agregar las paradas" }
];

const Progreso = ({ pasoActual }) => (
    <View style={s.progresoContenedor}>
        {PASOS.map((paso, i) => (
            <View key={paso.numero} style={s.progresoItem}>
                <View style={[
                    s.progresoBurbuja,
                    pasoActual === paso.numero && s.progresoBurbujaActiva,
                    pasoActual > paso.numero && s.progresoBurbujaCompletada,
                ]}>
                    {pasoActual > paso.numero
                        ? <Ionicons name="checkmark" size={12} color="white" />
                        : <Text style={[s.progresoNumero, pasoActual === paso.numero && { color: 'white' }]}>
                            {paso.numero}
                        </Text>
                    }
                </View>
                {i < PASOS.length - 1 && (
                    <View style={[s.progresoLinea, pasoActual > paso.numero && s.progresoLineaActiva]} />
                )}
            </View>
        ))}
    </View>
);

const Paso1 = ({ nombreRuta, setNombreRuta, numeroRuta, setNumeroRuta }) => (
    <View style={s.pasoContenedor}>
        <TextInput
            style={s.input}
            value={nombreRuta}
            onChangeText={setNombreRuta}
            placeholder="Nombre de la ruta"
            placeholderTextColor={T.input.placeholder}
        />
        <TextInput
            style={s.input}
            value={numeroRuta}
            onChangeText={setNumeroRuta}
            placeholder="Número de ruta"
            placeholderTextColor={T.input.placeholder}
            keyboardType="numeric"
        />
    </View>
);

const Paso2 = ({
    conductores, vehiculos,
    conductorId, setConductorId,
    vehiculoId, setVehiculoId,
    horaInicio, setHoraInicio,
    horaFin, setHoraFin,
}) => (
    <View style={s.pasoContenedor}>
        <Text style={s.labelSeccion}>Conductor</Text>
        <View style={s.selectorContenedor}>
            <Picker selectedValue={conductorId} onValueChange={setConductorId} style={{ color: T.input.text }}>
                <Picker.Item label="Selecciona un conductor..." value={null} />
                {conductores.map(c => <Picker.Item key={c.id} label={c.nombre} value={c.id} />)}
            </Picker>
        </View>
        <Text style={s.labelSeccion}>Vehículo</Text>
        <View style={s.selectorContenedor}>
            <Picker selectedValue={vehiculoId} onValueChange={setVehiculoId} style={{ color: T.input.text }}>
                <Picker.Item label="Selecciona un vehículo..." value={null} />
                {vehiculos.map(v => <Picker.Item key={v.id} label={v.placa} value={v.id} />)}
            </Picker>
        </View>
        <Text style={s.labelSeccion}>Vehículo</Text>
        <View style={s.selectorContenedor}>
            <TextInput
                style={[s.input, { flex: 1 }]}
                value={horaInicio}
                onChangeText={setHoraInicio}
                placeholder="Inicio (06:00)"
                placeholderTextColor={T.input.placeholder}
            />
            <TextInput
                style={[s.input, { flex: 1 }]}
                value={horaFin}
                onChangeText={setHoraFin}
                placeholder="Fin (18:00)"
                placeholderTextColor={T.input.placeholder}
            />
        </View>
    </View>
);

const Paso3 = ({ puntosRuta, eliminarPunto, limpiarPuntos }) => (
    <View style={s.pasoContenedor}>
        <View style={s.infoTrazado}>
            <Ionicons name="information-circle-outline" size={16} color="#22C55E" />
            <Text style={s.textoInfoTrazado}>Toca el mapa para agregar puntos a la ruta</Text>
        </View>
        <Text style={s.labelSeccion}>Puntos seleccionados: {puntosRuta.length}</Text>
        <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
            {puntosRuta.length === 0 && (
                <Text style={s.textoSinPuntos}>Aún no has agregado puntos</Text>
            )}
            {puntosRuta.map((punto, i) => (
                <View key={punto.id} style={s.puntoItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <View style={s.puntoBurbuja}>
                            <Text style={s.puntoNumero}>{i + 1}</Text>
                        </View>
                        <Text style={s.puntoCoordenadas} numberOfLines={1}>
                            {punto.direccion || `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarPunto(punto.id)}>
                        <Ionicons name="trash-outline" size={18} color={T.icon.error} />
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
        {puntosRuta.length > 0 && (
            <TouchableOpacity style={s.botonLimpiar} onPress={limpiarPuntos}>
                <Text style={s.textoLimpiar}>Limpiar todos los puntos</Text>
            </TouchableOpacity>
        )}
    </View>
);

//Paso $ mostramos un panel para escoger las paradas del bus 
const Paso4 = ({ PuntosParada, eliminarPunto, limpiarParadas }) => (
    <View style={s.pasoContenedor}>
        <View style={s.infoTrazado}>
            <Ionicons name="information-circle-outline" size={16} color="#22C55E" />
            <Text style={s.textoInfoTrazado}>Toca el mapa para agregar puntos a la ruta</Text>
        </View>
        <Text style={s.labelSeccion}>Puntos seleccionados: {puntosRuta.length}</Text>
        <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
            {puntosRuta.length === 0 && (
                <Text style={s.textoSinPuntos}>Aún no has agregado puntos</Text>
            )}
            {puntosRuta.map((punto, i) => (
                <View key={punto.id} style={s.puntoItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <View style={s.puntoBurbuja}>
                            <Text style={s.puntoNumero}>{i + 1}</Text>
                        </View>
                        <Text style={s.puntoCoordenadas} numberOfLines={1}>
                            {punto.direccion || `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarPunto(punto.id)}>
                        <Ionicons name="trash-outline" size={18} color={T.icon.error} />
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
        {puntosRuta.length > 0 && (
            <TouchableOpacity style={s.botonLimpiar} onPress={limpiarPuntos}>
                <Text style={s.textoLimpiar}>Limpiar todos los puntos</Text>
            </TouchableOpacity>
        )}
    </View>
);

const PanelRuta = ({
    nombreRuta, setNombreRuta,
    numeroRuta, setNumeroRuta,
    puntosRuta, eliminarPunto,
    limpiarPuntos, guardarRuta,
    setPanelVisible, setModoEdicion,
    conductores, vehiculos,
    conductorId, setConductorId,
    vehiculoId, setVehiculoId,
    horaInicio, setHoraInicio,
    horaFin, setHoraFin,
    showError, showWarning,
    panelColapsado, setPanelColapsado,
    paso, setPaso,
    handleConductorChange,
}) => {

    const [errores, setErrores] = useState({});  // ← errores inline
    const translateY = useRef(new Animated.Value(0)).current;
    const colapsadoRef = useRef(false); // ← ref para el PanResponder (evita bug de closure)

    const ALTURA_COLAPSO = 290;

    const expandir = () => {
        Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50, friction: 8,
        }).start(() => {
            colapsadoRef.current = false;
            setPanelColapsado(false);
        });
    };

    const colapsar = () => {
        Animated.spring(translateY, {
            toValue: ALTURA_COLAPSO,
            useNativeDriver: true,
            tension: 50, friction: 8,
        }).start(() => {
            colapsadoRef.current = true;
            setPanelColapsado(true);
        });
    };

    const panResponder = useRef(PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
            Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),

        onPanResponderMove: (_, gesture) => {
            if (!colapsadoRef.current && gesture.dy > 0) {
                translateY.setValue(gesture.dy);
            } else if (colapsadoRef.current && gesture.dy < 0) {
                translateY.setValue(ALTURA_COLAPSO + gesture.dy);
            }
        },

        onPanResponderRelease: (_, gesture) => {
            if (!colapsadoRef.current && gesture.dy > 60) {
                colapsar();
            } else if (colapsadoRef.current && gesture.dy < -60) {
                expandir();
            } else {
                Animated.spring(translateY, {
                    toValue: colapsadoRef.current ? ALTURA_COLAPSO : 0,
                    useNativeDriver: true,
                    tension: 50, friction: 8,
                }).start();
            }
        },
    })).current;

    const validarPaso = () => {
        const nuevosErrores = {};

        if (paso === 1) {
            if (!nombreRuta.trim()) nuevosErrores.nombre = "El nombre de la ruta es obligatorio";
            if (!numeroRuta.trim()) nuevosErrores.numero = "El número de ruta es obligatorio";
        }
        if (paso === 2) {
            if (!conductorId) nuevosErrores.conductor = "Debes seleccionar un conductor";
        }
        if (paso === 3) {
            if (!puntosRuta.length) showWarning("Debes agregar al menos un punto");
        }
        if (paso === 4) {
            if (!puntosRuta.length) showWarning("Debes agregar al menos un punto de parada");
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const siguiente = () => {
        if (validarPaso()) {
            Keyboard.dismiss();
            setErrores({});
            translateY.setValue(0);
            setTimeout(() => {
                setPaso(p => p + 1);
            }, 150);
        }
    };

    const anterior = () => {
        setErrores({});
        translateY.setValue(0);
        setPaso(p => p - 1);
    };

    const cancelar = () => {
        setModoEdicion(false);
        setPaso(1);
        setErrores({});
        translateY.setValue(0);
    };

    return (
        <Animated.View style={[s.panel, { transform: [{ translateY }] }]}>

            {/* Handle — deslizable solo en paso 3 */}
            <View {...(paso === 3 ? panResponder.panHandlers : {})}>
                <View style={s.handleContenedor}>
                    <View style={s.handle} />
                    {paso === 3 && (
                        <Text style={s.textoHint}>
                            {panelColapsado ? '↑ Desliza para ver el panel' : '↓ Desliza para tocar el mapa'}
                        </Text>
                    )}
                </View>
            </View>

            {/* Header */}
            <View style={s.header}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.titulo}>{PASOS[paso - 1].titulo}</Text>
                    <Text style={s.subtitulo}>Paso {paso} de {PASOS.length} · {PASOS[paso - 1].subtitulo}</Text>
                </View>
                <TouchableOpacity onPress={cancelar} style={s.botonCerrar}>
                    <Ionicons name="close" size={20} color={T.text.secondary} />
                </TouchableOpacity>
            </View>

            <Progreso pasoActual={paso} />

            {/* Paso 1 con errores inline */}
            {paso === 1 && (
                <View style={s.pasoContenedor}>
                    <TextInput
                        style={[s.input, errores.nombre && s.inputError]}
                        value={nombreRuta}
                        onChangeText={(v) => { setNombreRuta(v); setErrores(e => ({ ...e, nombre: null })); }}
                        placeholder="Nombre de la ruta"
                        placeholderTextColor={T.input.placeholder}
                    />
                    {errores.nombre && <Text style={s.textoError}>{errores.nombre}</Text>}

                    <TextInput
                        style={[s.input, errores.numero && s.inputError]}
                        value={numeroRuta}
                        onChangeText={(v) => { setNumeroRuta(v); setErrores(e => ({ ...e, numero: null })); }}
                        placeholder="Número de ruta"
                        placeholderTextColor={T.input.placeholder}
                        keyboardType="numeric"
                    />
                    {errores.numero && <Text style={s.textoError}>{errores.numero}</Text>}
                </View>
            )}

            {/* Paso 2 con errores inline */}
            {paso === 2 && (
                <View style={s.pasoContenedor}>
                    <Text style={s.labelSeccion}>Conductor</Text>
                    <View style={[s.selectorContenedor, errores.conductor && s.selectorError]}>
                        <Picker selectedValue={conductorId} onValueChange={(v) => { handleConductorChange(v); setErrores(e => ({ ...e, conductor: null })); }} style={{ color: T.input.text }}>
                            <Picker.Item label="Selecciona un conductor..." value={null} />
                            {conductores.map(c => <Picker.Item key={c.id} label={c.nombre} value={c.id} />)}
                        </Picker>
                    </View>
                    {errores.conductor && <Text style={s.textoError}>{errores.conductor}</Text>}

                    <Text style={s.labelSeccion}>Vehículo asignado</Text>
                    <View style={s.selectorContenedor}>
                        <Text style={{ padding: 14, color: T.input.text }}>
                            {vehiculos.find(v => v.id === vehiculoId)?.placa || 'Se asignará al escoger conductor'}
                        </Text>
                    </View>
                    {errores.vehiculo && <Text style={s.textoError}>{errores.vehiculo}</Text>}

                    <Text style={s.labelSeccion}>Horario</Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <TextInput
                            style={[s.input, { flex: 1 }]}
                            value={horaInicio}
                            onChangeText={setHoraInicio}
                            placeholder="Inicio (06:00)"
                            placeholderTextColor={T.input.placeholder}
                        />
                        <TextInput
                            style={[s.input, { flex: 1 }]}
                            value={horaFin}
                            onChangeText={setHoraFin}
                            placeholder="Fin (18:00)"
                            placeholderTextColor={T.input.placeholder}
                        />
                    </View>
                </View>
            )}

            {paso === 3 && (
                <Paso3
                    puntosRuta={puntosRuta}
                    eliminarPunto={eliminarPunto}
                    limpiarPuntos={limpiarPuntos}
                />
            )}

            <View style={s.botonesNavegacion}>
                {paso > 1 ? (
                    <TouchableOpacity style={s.botonAtras} onPress={anterior}>
                        <Ionicons name="arrow-back" size={16} color={T.text.secondary} />
                        <Text style={s.textoAtras}>Atrás</Text>
                    </TouchableOpacity>
                ) : <View style={{ flex: 1 }} />}

                {paso < PASOS.length ? (
                    <TouchableOpacity style={s.botonSiguiente} onPress={siguiente}>
                        <Text style={s.textoSiguiente}>Siguiente</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={s.botonGuardar} onPress={guardarRuta}>
                        <Ionicons name="checkmark-circle" size={16} color="white" />
                        <Text style={s.textoGuardar}>Guardar ruta</Text>
                    </TouchableOpacity>
                )}
            </View>
        </Animated.View>
    );
};

const s = StyleSheet.create({
    panel: {
        backgroundColor: T.cards.background,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    handleContenedor: {
        alignItems: 'center',
        paddingVertical: 4,
        marginBottom: 8,
    },
    handle: {
        width: 40, height: 4,
        backgroundColor: '#e2e8f0',
        borderRadius: 2,
        marginTop: 10,
    },
    textoHint: {
        fontSize: 11,
        color: T.text.secondary,
        marginTop: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    titulo: { fontSize: 17, fontWeight: '700', color: T.text.primary },
    subtitulo: { fontSize: 12, color: T.text.secondary, marginTop: 2 },
    botonCerrar: {
        padding: 4,
        backgroundColor: T.input.background,
        borderRadius: 20,
    },
    progresoContenedor: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    progresoItem: { flexDirection: 'row', alignItems: 'center' },
    progresoBurbuja: {
        width: 28, height: 28,
        borderRadius: 14,
        backgroundColor: T.input.background,
        borderWidth: 2,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    progresoBurbujaActiva: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
    progresoBurbujaCompletada: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
    progresoNumero: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
    progresoLinea: { width: 40, height: 2, backgroundColor: '#e2e8f0', marginHorizontal: 4 },
    progresoLineaActiva: { backgroundColor: '#22C55E' },
    pasoContenedor: { marginBottom: 16 },
    input: {
        backgroundColor: T.input.background,
        borderColor: T.input.border,
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: T.input.text,
        fontSize: 14,
        marginBottom: 4,
    },
    inputError: {
        borderColor: '#ef4444',
        borderWidth: 1.5,
    },
    textoError: {
        fontSize: 11,
        color: '#ef4444',
        marginBottom: 8,
        marginLeft: 4,
    },
    selectorContenedor: {
        borderWidth: 1,
        borderColor: T.input.border,
        borderRadius: 10,
        backgroundColor: T.input.background,
        marginBottom: 4,
        overflow: 'hidden',
    },
    selectorError: {
        borderColor: '#ef4444',
        borderWidth: 1.5,
    },
    labelSeccion: {
        fontSize: 13,
        fontWeight: '600',
        color: T.text.primary,
        marginBottom: 6,
        marginTop: 4,
    },
    infoTrazado: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#f0fdf4',
        borderRadius: 8,
        padding: 10,
        marginBottom: 12,
    },
    textoInfoTrazado: { fontSize: 12, color: '#16a34a', flex: 1 },
    textoSinPuntos: { color: T.text.secondary, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
    puntoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: T.cards.border,
    },
    puntoBurbuja: {
        width: 22, height: 22,
        borderRadius: 11,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    puntoNumero: { fontSize: 11, fontWeight: '700', color: 'white' },
    puntoCoordenadas: { fontSize: 12, color: T.text.secondary, flex: 1 },
    botonLimpiar: { marginTop: 8, alignSelf: 'flex-start' },
    textoLimpiar: { fontSize: 12, color: T.icon?.error || '#ef4444' },
    botonesNavegacion: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        gap: 12,
    },
    botonAtras: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: T.input.border,
        flex: 1,
        justifyContent: 'center',
    },
    textoAtras: { color: T.text.secondary, fontWeight: '600', fontSize: 14 },
    botonSiguiente: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#22C55E',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        flex: 1,
        justifyContent: 'center',
    },
    textoSiguiente: { color: 'white', fontWeight: '700', fontSize: 14 },
    botonGuardar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#16a34a',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        flex: 1,
        justifyContent: 'center',
    },
    textoGuardar: { color: 'white', fontWeight: '700', fontSize: 14 },
});

export default PanelRuta;