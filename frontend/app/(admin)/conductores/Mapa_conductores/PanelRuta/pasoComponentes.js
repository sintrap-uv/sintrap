import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import s from "./panelRutaStyles";
import theme from "../../../../../constants/theme";
import SelectorDias from "../../../../../components/panelRuta/SelectorDias";

const T = theme.lightMode;

// Array de pasos para el progreso (debe coincidir con el del panel principal)
export const PASOS = [
    { numero: 1, titulo: "Información de la ruta", subtitulo: "Nombre y número" },
    { numero: 2, titulo: "Recursos", subtitulo: "Conductor, vehículo y horario" },
    { numero: 3, titulo: "Trazar ruta", subtitulo: "Toca el mapa para agregar puntos" },
    { numero: 4, titulo: "Escoge las paradas del bus", subtitulo: "Toca el mapa para agregar las paradas" }
];

export const Progreso = ({ pasoActual }) => (
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

export const Paso1 = ({ nombreRuta, setNombreRuta, numeroRuta, setNumeroRuta, errores }) => (
    <View style={s.pasoContenedor}>
        <TextInput
            style={[s.input, errores?.nombre && s.inputError]}
            value={nombreRuta}
            onChangeText={setNombreRuta}
            placeholder="Nombre de la ruta"
            placeholderTextColor={T.input.placeholder}
        />
        {errores?.nombre && <Text style={s.textoError}>{errores.nombre}</Text>}

        <TextInput
            style={[s.input, errores?.numero && s.inputError]}
            value={numeroRuta}
            onChangeText={setNumeroRuta}
            placeholder="Número de ruta"
            placeholderTextColor={T.input.placeholder}
            keyboardType="numeric"
        />
        {errores?.numero && <Text style={s.textoError}>{errores.numero}</Text>}
    </View>
);

export const Paso2 = ({
    conductores, vehiculos,
    conductorId, setConductorId,
    vehiculoId, setVehiculoId,
    horaInicio, setHoraInicio,
    horaFin, setHoraFin,
    turnoId, turnos,
    diasTipo, setDiasTipo,
    errores,
    mostrarPickerInicio, setMostrarPickerInicio,
    mostrarPickerFin, setMostrarPickerFin,
    handleHoraInicioChange,
}) => (
    <View style={s.pasoContenedor}>
        <Text style={s.labelSeccion}>Horario de la ruta</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
                style={[s.input, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setMostrarPickerInicio(true)}>
                <Text style={{ color: horaInicio ? T.input.text : T.input.placeholder }}>
                    {horaInicio || 'Inicio (06:00)'}
                </Text>
            </TouchableOpacity>
            {errores?.horaInicio && <Text style={s.textoError}>{errores.horaInicio}</Text>}

            <TouchableOpacity
                style={[s.input, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setMostrarPickerFin(true)}>
                <Text style={{ color: horaFin ? T.input.text : T.input.placeholder }}>
                    {horaFin || 'Fin (18:00)'}
                </Text>
            </TouchableOpacity>
            {errores?.horaFin && <Text style={s.textoError}>{errores.horaFin}</Text>}
        </View>

        {mostrarPickerInicio && (
            <DateTimePicker
                value={(() => {
                    const [h, m] = (horaInicio || '06:00').split(':').map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0);
                    return d;
                })()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, date) => {
                    setMostrarPickerInicio(false);
                    if (date) {
                        const h = String(date.getHours()).padStart(2, '0');
                        const m = String(date.getMinutes()).padStart(2, '0');
                        handleHoraInicioChange(`${h}:${m}`);
                    }
                }}
            />
        )}
        {mostrarPickerFin && (
            <DateTimePicker
                value={(() => {
                    const [h, m] = (horaFin || '18:00').split(':').map(Number);
                    const d = new Date();
                    d.setHours(h, m, 0);
                    return d;
                })()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, date) => {
                    setMostrarPickerFin(false);
                    if (date) {
                        const h = String(date.getHours()).padStart(2, '0');
                        const m = String(date.getMinutes()).padStart(2, '0');
                        setHoraFin(`${h}:${m}`);
                    }
                }}
            />
        )}

        <Text style={s.labelSeccion}>Conductor</Text>
        <View style={[s.selectorContenedor, errores?.conductor && s.selectorError]}>
            <Picker selectedValue={conductorId} onValueChange={(v) => { setConductorId(v); }} style={{ color: T.input.text }}>
                <Picker.Item label="Selecciona un conductor..." value={null} />
                {conductores.map(c => <Picker.Item key={c.id} label={c.nombre} value={c.id} />)}
            </Picker>
        </View>
        {errores?.conductor && <Text style={s.textoError}>{errores.conductor}</Text>}

        <Text style={s.labelSeccion}>Vehículo asignado</Text>
        <View style={s.selectorContenedor}>
            <Text style={{ padding: 14, color: T.input.text }}>
                {vehiculos.find(v => v.id === vehiculoId)?.placa || 'Se asignará al escoger conductor'}
            </Text>
        </View>
        {errores?.vehiculo && <Text style={s.textoError}>{errores.vehiculo}</Text>}

        <Text style={s.labelSeccion}>Días de operación</Text>
        <SelectorDias
            dias={diasTipo}
            setDias={setDiasTipo}
            error={errores?.dias}   

        />

        <Text style={s.labelSeccion}>Turno (asignado automáticamente)</Text>
        <View style={s.selectorContenedor}>
            <Text style={{ padding: 14, color: T.input.text }}>
                {turnos.find(t => t.id === turnoId)?.nombre || 'Selecciona una hora de inicio'}
            </Text>
        </View>
        {errores?.turno && <Text style={s.textoError}>{errores.turno}</Text>}
    </View>
);

export const Paso3 = ({ puntosRuta, eliminarPunto, limpiarPuntos, errores }) => (
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
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
        {puntosRuta.length > 0 && (
            <TouchableOpacity style={s.botonLimpiar} onPress={limpiarPuntos}>
                <Text style={s.textoLimpiar}>Limpiar todos los puntos</Text>
            </TouchableOpacity>
        )}
        {errores?.puntos && <Text style={s.textoError}>{errores.puntos}</Text>}
    </View>
);

export const Paso4 = ({ puntosParada, eliminarParada, limpiarParadas, errores }) => (
    <View style={s.pasoContenedor}>
        <View style={s.infoTrazado}>
            <Ionicons name="information-circle-outline" size={16} color="#EF4444" />
            <Text style={[s.textoInfoTrazado, { color: '#DC2626' }]}>
                Toca el mapa para marcar paradas del bus
            </Text>
        </View>
        <Text style={s.labelSeccion}>Paradas marcadas: {puntosParada.length}</Text>
        <ScrollView style={{ maxHeight: 140 }} showsVerticalScrollIndicator={false}>
            {puntosParada.length === 0 && (
                <Text style={s.textoSinPuntos}>Aún no has marcado paradas</Text>
            )}
            {puntosParada.map((punto, i) => (
                <View key={punto.id} style={s.puntoItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <View style={[s.puntoBurbuja, { backgroundColor: '#EF4444' }]}>
                            <Text style={s.puntoNumero}>{i + 1}</Text>
                        </View>
                        <Text style={s.puntoCoordenadas} numberOfLines={1}>
                            {punto.direccion || `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarParada(punto.id)}>
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
        {puntosParada.length > 0 && (
            <TouchableOpacity style={s.botonLimpiar} onPress={limpiarParadas}>
                <Text style={s.textoLimpiar}>Limpiar todas las paradas</Text>
            </TouchableOpacity>
        )}
        {errores?.paradas && <Text style={s.textoError}>{errores.paradas}</Text>}
    </View>
);