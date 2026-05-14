import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, PanResponder, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../../../constants/theme";
import { ActivityIndicator } from 'react-native';
import s from "./panelRutaStyles"
import { Progreso, Paso1, Paso2, Paso3, Paso4, PASOS } from "./pasoComponentes";

const T = theme.lightMode;

const PanelRuta = ({
    nombreRuta, setNombreRuta,
    numeroRuta, setNumeroRuta,
    puntosRuta, eliminarPunto,
    limpiarPuntos, guardarRuta,
    setPanelVisible, setModoEdicion,
    conductores, vehiculos,
    conductorId, handleConductorChange,
    vehiculoId, setVehiculoId,
    horaInicio, setHoraInicio,
    horaFin, setHoraFin,
    showError, showWarning,
    panelColapsado, setPanelColapsado,
    paso, setPaso,
    sincronizarModoMapa,
    puntosParada,
    eliminarParada,
    limpiarParadas,
    turnoId, setTurnoId,
    turnos,
    diasTipo, setDiasTipo,
    handleHoraInicioChange,
    verificarNumeroRuta,
    verificarConflictoHorarioVehiculo,
    verificarEstadoVehiculo,
    guardando
}) => {
    const [errores, setErrores] = useState({});
    const [mostrarPickerInicio, setMostrarPickerInicio] = useState(false);
    const [mostrarPickerFin, setMostrarPickerFin] = useState(false);
    const translateY = useRef(new Animated.Value(0)).current;
    const colapsadoRef = useRef(false);
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

    const validarPaso = async () => {
        const nuevosErrores = {};

        if (paso === 1) {
            const nombreTrim = nombreRuta.trim();
            if (!nombreTrim) nuevosErrores.nombre = "El nombre de la ruta es obligatorio";
            else if (nombreTrim.length < 3) nuevosErrores.nombre = "El nombre debe tener al menos 3 caracteres";

            const numeroTrim = numeroRuta.trim();
            if (!numeroTrim) nuevosErrores.numero = "El número de ruta es obligatorio";
            else if (!/^\d+$/.test(numeroTrim)) nuevosErrores.numero = "Debe ser un número entero positivo";
            else {
                const numero = parseInt(numeroTrim, 10);
                if (numero <= 0) nuevosErrores.numero = "El número debe ser mayor a 0";
                else if (verificarNumeroRuta) {
                    const existe = await verificarNumeroRuta(numero);
                    if (existe) nuevosErrores.numero = `Ya existe una ruta con el número ${numero}`;
                }
            }
        }

        if (paso === 2) {
            if (!conductorId) nuevosErrores.conductor = "Debes seleccionar un conductor";
            if (!turnoId) nuevosErrores.turno = "Debes seleccionar un turno";

            const horaRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
            if (!horaInicio || !horaRegex.test(horaInicio)) nuevosErrores.horaInicio = "Formato inválido (HH:MM)";
            if (!horaFin || !horaRegex.test(horaFin)) nuevosErrores.horaFin = "Formato inválido (HH:MM)";
            if (horaRegex.test(horaInicio) && horaRegex.test(horaFin) && horaInicio >= horaFin) {
                nuevosErrores.horaFin = "La hora final debe ser mayor a la inicial";
            }

            if (conductorId && !vehiculoId) nuevosErrores.vehiculo = "El conductor seleccionado no tiene vehículo asignado";

            if (vehiculoId && !nuevosErrores.vehiculo && verificarEstadoVehiculo && verificarConflictoHorarioVehiculo) {
                const vehiculo = vehiculos.find(v => v.id === vehiculoId);
                if (vehiculo) {
                    const { valido, advertencias } = verificarEstadoVehiculo(vehiculo);
                    if (!valido) nuevosErrores.vehiculo = advertencias.join(', ');
                    else {
                        const tieneConflicto = await verificarConflictoHorarioVehiculo(vehiculoId, horaInicio);
                        if (tieneConflicto) nuevosErrores.horaInicio = `El vehículo ya tiene una ruta a las ${horaInicio}`;
                    }
                }
            }

            if (turnoId && horaInicio && !nuevosErrores.horaInicio) {
                const [h] = horaInicio.split(':').map(Number);
                let turnoEsperado;
                if (h >= 6 && h < 14) turnoEsperado = 'mañana';
                else if (h >= 14 && h < 22) turnoEsperado = 'tarde';
                else turnoEsperado = 'noche';
                const turnoSeleccionado = turnos.find(t => t.id === turnoId);
                if (turnoSeleccionado && !turnoSeleccionado.nombre.toLowerCase().includes(turnoEsperado)) {
                    nuevosErrores.turno = `El horario ${horaInicio} no corresponde al turno seleccionado (${turnoSeleccionado.nombre})`;
                }
            }
        }

        if (paso === 3) {
            if (puntosRuta.length < 2) {
                nuevosErrores.puntos = "La ruta debe tener al menos 2 puntos (inicio y fin)";
            }
        }

        if (paso === 4) {
            if (puntosParada.length === 0) {
                nuevosErrores.paradas = "Debes agregar al menos una parada";
            }
        }

        setErrores(nuevosErrores);
        return Object.keys(nuevosErrores).length === 0;
    };

    const siguiente = async () => {
        const esValido = await validarPaso();
        if (esValido) {
            Keyboard.dismiss();
            setErrores({});
            translateY.setValue(0);
            colapsadoRef.current = false;
            setPanelColapsado(false);
            const nuevoPaso = paso + 1;
            setPaso(nuevoPaso);
            sincronizarModoMapa(nuevoPaso);
        }
    };

    const anterior = () => {
        setErrores({});
        translateY.setValue(0);
        const nuevoPaso = paso - 1;
        setPaso(nuevoPaso);
        sincronizarModoMapa(nuevoPaso);
    };

    const cancelar = () => {
        setModoEdicion(false);
        setPaso(1);
        setErrores({});
        translateY.setValue(0);
        sincronizarModoMapa(1);
    };

    return (
        <Animated.View style={[s.panel, { transform: [{ translateY }] }]}>
            <View {...((paso === 3 || paso === 4) ? panResponder.panHandlers : {})}>
                <View style={s.handleContenedor}>
                    <View style={s.handle} />
                    {(paso === 3 || paso === 4) && (
                        <Text style={s.textoHint}>
                            {panelColapsado ? '↑ Desliza para ver el panel' : '↓ Desliza para tocar el mapa'}
                        </Text>
                    )}
                </View>
            </View>

            <View style={s.header}>
                <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={s.titulo}>{Progreso.PASOS?.[paso - 1]?.titulo ?? 'Panel'}</Text>
                    <Text style={s.subtitulo}>Paso {paso} de 4</Text>
                </View>
                <TouchableOpacity onPress={cancelar} style={s.botonCerrar}>
                    <Ionicons name="close" size={20} color={T.text.secondary} />
                </TouchableOpacity>
            </View>

            <Progreso pasoActual={paso} />

            {paso === 1 && (
                <Paso1
                    nombreRuta={nombreRuta}
                    setNombreRuta={setNombreRuta}
                    numeroRuta={numeroRuta}
                    setNumeroRuta={setNumeroRuta}
                    errores={errores}
                />
            )}

            {paso === 2 && (
                <Paso2
                    conductores={conductores}
                    vehiculos={vehiculos}
                    conductorId={conductorId}
                    setConductorId={handleConductorChange}
                    vehiculoId={vehiculoId}
                    setVehiculoId={setVehiculoId}
                    horaInicio={horaInicio}
                    setHoraInicio={setHoraInicio}
                    horaFin={horaFin}
                    setHoraFin={setHoraFin}
                    turnoId={turnoId}
                    turnos={turnos}
                    diasTipo={diasTipo}
                    setDiasTipo={setDiasTipo}
                    errores={errores}
                    mostrarPickerInicio={mostrarPickerInicio}
                    setMostrarPickerInicio={setMostrarPickerInicio}
                    mostrarPickerFin={mostrarPickerFin}
                    setMostrarPickerFin={setMostrarPickerFin}
                    handleHoraInicioChange={handleHoraInicioChange}
                />
            )}

            {paso === 3 && (
                <Paso3
                    puntosRuta={puntosRuta}
                    eliminarPunto={eliminarPunto}
                    limpiarPuntos={limpiarPuntos}
                    errores={errores}
                />
            )}

            {paso === 4 && (
                <Paso4
                    puntosParada={puntosParada}
                    eliminarParada={eliminarParada}
                    limpiarParadas={limpiarParadas}
                    errores={errores}
                />
            )}

            <View style={s.botonesNavegacion}>
                {paso > 1 && (
                    <TouchableOpacity style={s.botonAtras} onPress={anterior}>
                        <Ionicons name="arrow-back" size={16} color={T.text.secondary} />
                        <Text style={s.textoAtras}>Atrás</Text>
                    </TouchableOpacity>
                )}
                {paso < 4 ? (
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

export default PanelRuta;