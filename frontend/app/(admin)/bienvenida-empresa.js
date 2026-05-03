import { useState, useEffect } from "react";
import { existeConfiguracionBuses } from "../../services/empresaServices";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { StyleSheet } from "react-native";
import theme from "../../constants/theme";

export default function Bienvenida({ onNavegar }) {
    const [cargando, setCargando] = useState(true);
    const [configuracionExistente, setConfiguracionExistente] = useState(false);


    const existe = async () => {

        const resultado = await existeConfiguracionBuses()

        if (resultado) {
            onNavegar('mapa_colaboradores')
            return
        }
        setCargando(false);
    }

    useEffect(() => {
        existe();
    }, [])


    if (cargando) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.lightMode.Button.primary.background} />
            </View>
        );
    }

    if (!configuracionExistente) {
        return (
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.titulo}>Bienvenido a Sintrap</Text>
                    <Text style={styles.mensaje}>
                        Para comenzar, necesitamos saber dónde se encuentra el punto de salida de tus buses.
                    </Text>
                    <Text style={styles.mensaje}>
                        Si estás en el lugar, puedes usar tu ubicación actual o tocar el mapa más adelante.
                    </Text>
                    <Text>Feliz dia</Text>
                    <TouchableOpacity style={styles.boton} onPress={() => onNavegar('configurar_buses')}>
                        <Text style={styles.textoBoton}>Configurar salida</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );

    }
    return null;

}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.lightMode.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        backgroundColor: theme.lightMode.cards.background,
        borderRadius: 28,
        paddingVertical: 40,
        paddingHorizontal: 24,
        width: '100%',
        alignItems: 'center',
        // Sombra flotante (iOS y Android)
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 1,
        borderColor: theme.lightMode.cards.border,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 40,
        resizeMode: 'contain',
        tintColor: theme.lightMode.Button.primary.background, // opcional si tu logo es monocromático
    },
    titulo: {
        fontSize: 28,
        fontFamily: theme.lightMode.tipografia.fonts.bold,
        color: theme.lightMode.text.primary,
        textAlign: 'center',
        marginBottom: 20,
    },
    mensaje: {
        fontSize: 16,
        fontFamily: theme.lightMode.tipografia.fonts.regular,
        color: theme.lightMode.text.secondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 24,
        paddingHorizontal: 8,
    },
    boton: {
        backgroundColor: theme.lightMode.Button.primary.background,
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30, // más redondeado
        marginTop: 16,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    textoBoton: {
        color: theme.lightMode.Button.primary.Text,
        fontSize: 18,
        fontFamily: theme.lightMode.tipografia.fonts.bold,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.lightMode.background,
    },
});