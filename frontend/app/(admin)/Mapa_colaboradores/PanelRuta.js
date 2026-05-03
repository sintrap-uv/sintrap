import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import theme from "../../../constants/theme";
import { styles } from "./MapaColaboradores.styles";

const T = theme.lightMode;

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
}) => (
    <View style={[styles.panelCrearRuta, { backgroundColor: T.cards.background, borderTopColor: T.cards.border }]}>
        <View style={styles.panelHeader}>
            <Text style={[styles.panelTitulo, { color: T.text.primary }]}>Modo edición activado</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => setPanelVisible(false)}>
                    <Ionicons name="caret-up-outline" style={[styles.cerrarPanel, { color: T.text.secondary }]} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModoEdicion(false)}>
                    <Text style={[styles.cerrarPanel, { color: T.icon.error }]}>✕</Text>
                </TouchableOpacity>
            </View>
        </View>

        <ScrollView style={{ maxHeight: 420 }}>
            {/* Nombre y número */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={[styles.input, { backgroundColor: T.input.background, borderColor: T.input.border, color: T.input.text }]}
                    value={nombreRuta}
                    onChangeText={setNombreRuta}
                    placeholder="Nombre de la ruta"
                    placeholderTextColor={T.input.placeholder}
                />
                <TextInput
                    style={[styles.input, { backgroundColor: T.input.background, borderColor: T.input.border, color: T.input.text }]}
                    value={numeroRuta}
                    onChangeText={setNumeroRuta}
                    placeholder="Número de ruta"
                    placeholderTextColor={T.input.placeholder}
                    keyboardType="numeric"
                />
            </View>

            {/* Conductor */}
            <Text style={[styles.seccionTitulo, { color: T.text.primary }]}>Conductor</Text>
            <View style={[styles.selectorContenedor, { borderColor: T.input.border, backgroundColor: T.input.background }]}>
                <Picker selectedValue={conductorId} onValueChange={setConductorId} style={[styles.selector, { color: T.input.text }]}>
                    <Picker.Item label="Selecciona un conductor..." value={null} />
                    {conductores.map(c => (
                        <Picker.Item key={c.id} label={c.nombre} value={c.id} />
                    ))}
                </Picker>
            </View>

            {/* Vehículo */}
            <Text style={[styles.seccionTitulo, { color: T.text.primary }]}>Vehículo</Text>
            <View style={[styles.selectorContenedor, { borderColor: T.input.border, backgroundColor: T.input.background }]}>
                <Picker selectedValue={vehiculoId} onValueChange={setVehiculoId} style={[styles.selector, { color: T.input.text }]}>
                    <Picker.Item label="Selecciona un vehículo..." value={null} />
                    {vehiculos.map(v => (
                        <Picker.Item key={v.id} label={v.placa} value={v.id} />
                    ))}
                </Picker>
            </View>
            

            {/* Horario */}
            <Text style={{ color: T.text.primary, fontWeight: 'bold', marginBottom: 4 }}>Horario</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: T.input.background, borderColor: T.input.border, color: T.input.text }]}
                    value={horaInicio}
                    onChangeText={setHoraInicio}
                    placeholder="Inicio (06:00)"
                    placeholderTextColor={T.input.placeholder}
                />
                <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: T.input.background, borderColor: T.input.border, color: T.input.text }]}
                    value={horaFin}
                    onChangeText={setHoraFin}
                    placeholder="Fin (18:00)"
                    placeholderTextColor={T.input.placeholder}
                />
            </View>

            {/* Puntos */}
            <Text style={{ color: T.text.primary, marginBottom: 8, fontWeight: 'bold' }}>
                Puntos seleccionados: {puntosRuta.length}
            </Text>
            {puntosRuta.map((punto, i) => (
                <View key={punto.id} style={styles.puntoItem}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="pin-outline" style={styles.iconoUbicacion} />
                        <Text style={{ color: T.text.secondary, fontSize: 12 }}>
                            {i + 1}. {punto.direccion || `${punto.lat.toFixed(5)}, ${punto.lon.toFixed(5)}`}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => eliminarPunto(punto.id)}>
                        <Ionicons name="trash-outline" style={styles.iconoBasura} />
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>

        <TouchableOpacity style={styles.botonLimpiar} onPress={limpiarPuntos}>
            <Text style={styles.textoLimpiar}>Limpiar todos los puntos</Text>
        </TouchableOpacity>

        <TouchableOpacity
            style={[styles.botonGuardar, { backgroundColor: T.Button.primary.background }]}
            onPress={guardarRuta}>
            <Text style={[styles.textoGuardar, { color: T.Button.primary.Text }]}>Guardar Ruta</Text>
        </TouchableOpacity>
    </View>
);

export default PanelRuta;