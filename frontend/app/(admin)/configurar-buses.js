import { useState } from "react"
import theme from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import MapaSimple from "../../components/Mapa";
import { ubicacionBuses } from "../../services/empresaServices";
import { obtenerCordenadas } from "../../services/geocalizacion";
import { ActivityIndicator, TextInput, TouchableOpacity, View , Text} from "react-native";
import { StyleSheet } from "react-native";


export default function ConfiguracionBuses({onNavegar}) {

    const [ubicacion, setUbicacion] = useState(null);
    const [direccion, setDireccion] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const { showSuccess, showError, showWarning, showInfo } = useToast();


    const manejarSeleccionMapa = (coordenadas) => {

        setUbicacion({ lat: coordenadas.lat, lon: coordenadas.lon })
        setDireccion("");
        showSuccess("coordenadas guardadas")
    }

    const manejarBuscarDireccion = async () => {
        if (direccion.trim() === "") {
            showWarning("La direccion esta vacia")
            return
        }

        setBuscando(true)

        const coordenada = await obtenerCordenadas(direccion)

        if (coordenada) {
            setUbicacion({ lat: coordenada.latitud, lon: coordenada.longitud });

            setDireccion("");
            showSuccess("Direccion encontrada")
        }
        else {
            showWarning("No se encontro esa direccion")

        }
        setBuscando(false)

    }

    const buscarDireccionManual = () => {

    }

    const confirmarUbicacion = async () => {

        if (!ubicacion) {
            showInfo("Primero selecciona una ubicación")
            return;
        }
        setGuardando(true);
        const resultado = await ubicacionBuses(ubicacion.lat, ubicacion.lon);

        if (resultado.success) {
            showSuccess("Datos guardados");
            onNavegar('mapa_colaboradores');

        }
        else {
            showError("Error" + resultado.error)
            setGuardando(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.mapaContainer}>
                <MapaSimple onSeleccionado={manejarSeleccionMapa} />
            </View>
            <View style={styles.infoContainer}>
                <Text style={styles.infoTexto}>
                    {ubicacion
                        ? ` ${ubicacion.lat.toFixed(5)}, ${ubicacion.lon.toFixed(5)}`
                        : "Toca el mapa o busca una dirección"}
                </Text>
                <View style={styles.infoContainer}>
                    <TextInput
                        style={styles.input}
                        value={direccion}
                        onChangeText={setDireccion}
                        placeholder="Escribe una dirección (ej: Calle 10 #20-30)" />
                </View>

                {/* Boton de Buscar*/}
                <TouchableOpacity
                    style={styles.botonBuscar}
                    onPress={manejarBuscarDireccion}>
                    {buscando ? <ActivityIndicator size="small" color={theme.lightMode.Button.secondary.text} style={styles.loadingIndicator} /> : null}
                    <Text style={[styles.textoBoton, styles.textoBotonSecundario]}>Buscar dirección</Text>
                </TouchableOpacity>

                {/* Boton de confirmar*/}
                <TouchableOpacity
                    style={[styles.botonConfirmar, (!ubicacion || guardando)
                        && styles.botonDeshabilitado]}
                    onPress={confirmarUbicacion}
                    disabled={!ubicacion || guardando}>
                    {guardando ? <ActivityIndicator size="small" color={theme.lightMode.Button.primary.Text} style={styles.loadingIndicator} /> : null}
                    <Text style={styles.textoBoton}>Confirmar ubicación</Text>
                </TouchableOpacity>
            </View>
        </View >
    )
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.lightMode.background,
    },
    mapaContainer: {
        height: '60%',
        width: '100%',
    },
    infoContainer: {
        backgroundColor: theme.lightMode.cards.background,
        margin: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.lightMode.cards.border,
    },
    infoTexto: {
        fontSize: 14,
        color: theme.lightMode.text.primary,
        fontFamily: theme.lightMode.tipografia.fonts.regular,
    },
    inputContainer: {
        marginHorizontal: 16,
        marginVertical: 8,
    },
    input: {
        backgroundColor: theme.lightMode.input.background,
        borderWidth: 1,
        borderColor: theme.lightMode.input.border,
        borderRadius: theme.lightMode.input.borderRadius,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: theme.lightMode.tipografia.fontSize.input,
        color: theme.lightMode.input.text,
        fontFamily: theme.lightMode.tipografia.fonts.regular,
    },
    botonBuscar: {
        backgroundColor: theme.lightMode.Button.secondary.background,
        borderWidth: 1,
        borderColor: theme.lightMode.Button.secondary.border,
        borderRadius: theme.lightMode.Button.primary.borderRadius,
        paddingVertical: 12,
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    botonConfirmar: {
        backgroundColor: theme.lightMode.Button.primary.background,
        borderRadius: theme.lightMode.Button.primary.borderRadius,
        paddingVertical: 12,
        alignItems: 'center',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 24,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    botonDeshabilitado: {
        opacity: 0.6,
    },
    textoBoton: {
        color: theme.lightMode.Button.primary.Text,
        fontSize: theme.lightMode.tipografia.fontSize.card,
        fontFamily: theme.lightMode.tipografia.fonts.bold,
        textAlign: 'center',
    },
    textoBotonSecundario: {
        color: theme.lightMode.Button.secondary.text,
    },
    loadingIndicator: {
        marginRight: 8,
    },
});