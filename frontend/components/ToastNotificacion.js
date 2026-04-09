import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NotificacionToast = ({ visible, mensaje, tipo, alOcultar }) => {
    const animacionOpacidad = useRef(new Animated.Value(0)).current;
    const animacionDeslizar = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        if (visible) {
            //animacion de entrada
            Animated.parallel([
                Animated.timing(animacionOpacidad, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(animacionDeslizar, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
            // Auto-ocultar después de 3 segundos
            const temporizador = setTimeout(() => {
                ocultarToast();
            }, 3000);

            return () => clearTimeout(temporizador);
        }
        else {
            // Animación de salida
            Animated.parallel([
                Animated.timing(animacionOpacidad, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(animacionDeslizar, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    const ocultarToast = () => {
        Animated.parallel([
            Animated.timing(animacionOpacidad, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(animacionDeslizar, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => alOcultar());
    };

    if (!visible) return null;

    const obtenerIcono = () => {
        switch (tipo) {
            case 'exito':
                return 'checkmark-circle';
            case 'error':
                return 'alert-circle';
            case 'advertencia':
                return 'warning';
            default:
                return 'information-circle';
        }
    };

    const obtenerColorFondo = () => {
        switch (tipo) {
            case 'exito':
                return '#4CAF50';
            case 'error':
                return '#F44336';
            case 'advertencia':
                return '#FF9800';
            default:
                return '#2196F3';
        }
    };
    
    return (
        <Animated.View
            style={[
                styles.contenedor,
                {
                    opacity: animacionOpacidad,
                    transform: [{ translateY: animacionDeslizar }],
                    backgroundColor: obtenerColorFondo(),
                },
            ]}
        >
            <View style={styles.contenido}>
                <Ionicons name={obtenerIcono()} size={24} color="white" />
                <Text style={styles.mensaje}>{mensaje}</Text>
                <TouchableOpacity onPress={ocultarToast} style={styles.botonCerrar}>
                    <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    contenedor: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 40,
        left: 20,
        right: 20,
        borderRadius: 8,
        padding: 12,
        zIndex: 9999,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    contenido: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mensaje: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
        marginLeft: 12,
    },
    botonCerrar: {
        padding: 4,
    },
});

export default NotificacionToast;