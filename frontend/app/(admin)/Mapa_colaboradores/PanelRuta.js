// PanelRuta.jsx
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../../constants/theme";
import { styles } from "./MapaColaboradores.styles";

const T = theme.lightMode;

const PanelRuta = ({
    nombreRuta, setNombreRuta,
    numeroRuta, setNumeroRuta,
    puntosRuta, eliminarPunto,
    limpiarPuntos, guardarRuta,
    setPanelVisible, setModoEdicion,
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

        <Text style={{ color: T.text.primary, marginBottom: 8, fontWeight: 'bold' }}>
            Puntos seleccionados: {puntosRuta.length}
        </Text>
        <ScrollView style={{ maxHeight: 140 }}>
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