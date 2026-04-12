 /**
 * registrar-vehiculo.jsx
 * Pantalla: Crear nuevo vehículo — SINTRAP
 * Ruta: app/(admin)/registrar-vehiculo.jsx
 *
 * NOTA: No se usa la columna "capacidad".
 * La capacidad viene de la tabla tipo_vehiculo.
 */

import DateTimePicker from '@react-native-community/datetimepicker';
import { useState, useEffect } from 'react';
import {
  View, Text, Switch, StyleSheet,
  Modal, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, ScrollView,
  TextInput
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAvailableDrivers, registerVehicle, getTiposVehiculo } from '../../services/vehicleService';
import theme from '../../constants/theme';

const T = theme.lightMode;

export default function RegistrarVehiculo() {
  const [placa,             setPlaca]             = useState('');
  const [conductorId,       setConductorId]       = useState(null);
  const [conductorNombre,   setConductorNombre]   = useState('');
  const [conductores,       setConductores]       = useState([]);
  const [tiposVehiculo,     setTiposVehiculo]     = useState([]);
  const [tipoId,            setTipoId]            = useState(null);
  const [tipoNombre,        setTipoNombre]        = useState('');
  const [fecha_Inicio,      setFecha_Inicio]      = useState('');
  const [fecha_Vencimiento, setFecha_Vencimiento] = useState('');
  const [seguro,            setSeguro]            = useState(false);
  const [showInicio,        setShowInicio]        = useState(false);
  const [showVencimiento,   setShowVencimiento]   = useState(false);
  const [modalConductor,    setModalConductor]    = useState(false);
  const [modalTipo,         setModalTipo]         = useState(false);
  const [cargando,          setCargando]          = useState(false);

  useEffect(() => {
    const inicializar = async () => {
      try {
        const [drivers, tipos] = await Promise.all([
          getAvailableDrivers(),
          getTiposVehiculo(),
        ]);
        setConductores(drivers);
        setTiposVehiculo(tipos);
      } catch (error) {
        Alert.alert('Error', 'No se pudo cargar la información');
      }
    };
    inicializar();
  }, []);

  const validar = () => {
    if (!placa.trim()) {
      Alert.alert('Error', 'La placa es obligatoria');
      return false;
    }
    if (!conductorId) {
      Alert.alert('Error', 'Debes seleccionar un conductor');
      return false;
    }
    if (!tipoId) {
      Alert.alert('Error', 'Debes seleccionar el tipo de vehículo');
      return false;
    }
    if (seguro && !fecha_Inicio) {
      Alert.alert('Error', 'Debes seleccionar la fecha de inicio del SOAT');
      return false;
    }
    if (seguro && !fecha_Vencimiento) {
      Alert.alert('Error', 'Debes seleccionar la fecha de vencimiento del SOAT');
      return false;
    }
    return true;
  };

  const onChangeInicio = (event, selectedDate) => {
    setShowInicio(false);
    if (selectedDate) {
      setFecha_Inicio(selectedDate.toISOString().split('T')[0]);
    }
  };

  const onChangeVencimiento = (event, selectedDate) => {
    setShowVencimiento(false);
    if (selectedDate) {
      setFecha_Vencimiento(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      await registerVehicle({
        placa:             placa.trim().toUpperCase(),
        conductor_id:      conductorId,
        seguro:            seguro,
        fecha_inicio:      seguro ? fecha_Inicio      : null,
        fecha_vencimiento: seguro ? fecha_Vencimiento : null,
        tipo_vehiculo_id:  tipoId,
        // "capacidad" no se usa aquí
      });
      Alert.alert('¡Éxito!', 'Vehículo registrado correctamente', [
        { text: 'OK', onPress: () => router.replace('/home') }
      ]);
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar el vehículo');
    } finally {
      setCargando(false);
    }
  };

  const seleccionarConductor = (conductor) => {
    setConductorId(conductor.id);
    setConductorNombre(conductor.nombre);
    setModalConductor(false);
  };

  const seleccionarTipo = (tipo) => {
    setTipoId(tipo.id);
    setTipoNombre(tipo.nombre);
    setModalTipo(false);
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>

          {/* Placa */}
          <Text style={styles.label}>Placa del vehículo</Text>
          <View style={styles.inputRow}>
            <Ionicons name="bus-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="KRT22I"
              placeholderTextColor={T.input.placeholder}
              value={placa}
              onChangeText={(text) => setPlaca(text.toUpperCase())}
            />
          </View>

          {/* Tipo de vehículo */}
          <Text style={styles.label}>Tipo de vehículo</Text>
          <TouchableOpacity style={styles.inputRow} onPress={() => setModalTipo(true)}>
            <Ionicons name="car-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
            <Text style={[styles.textInput, !tipoId && { color: T.input.placeholder }]}>
              {tipoNombre || 'Seleccionar tipo'}
            </Text>
            <Ionicons name="chevron-down-outline" size={16} color={T.text.secondary} />
          </TouchableOpacity>

          {/* Conductor */}
          <Text style={styles.label}>Conductor</Text>
          <TouchableOpacity style={styles.inputRow} onPress={() => setModalConductor(true)}>
            <Ionicons name="person-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
            <Text style={[styles.textInput, !conductorId && { color: T.input.placeholder }]}>
              {conductorNombre || 'Seleccionar conductor'}
            </Text>
            <Ionicons name="chevron-down-outline" size={16} color={T.text.secondary} />
          </TouchableOpacity>

          {/* Seguro */}
          <Text style={styles.label}>Seguro</Text>
          <View style={styles.inputRow}>
            <Ionicons name="shield-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
            <Text style={{ flex: 1, color: T.text.primary }}>¿Tiene SOAT?</Text>
            <Switch
              value={seguro}
              onValueChange={setSeguro}
              trackColor={{ false: T.cards.border, true: "#BBF7D0" }}
              thumbColor={seguro ? T.Headers.innerColor : T.text.secondary}
            />
          </View>

          {/* Fechas SOAT */}
          {seguro && (
            <View>
              <Text style={styles.label}>Inicio del SOAT</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => setShowInicio(true)}>
                <Ionicons name="calendar-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
                <Text style={[styles.textInput, !fecha_Inicio && { color: T.input.placeholder }]}>
                  {fecha_Inicio || 'AA/MM/DD'}
                </Text>
              </TouchableOpacity>
              {showInicio && (
                <DateTimePicker value={new Date()} mode="date" onChange={onChangeInicio} />
              )}

              <Text style={styles.label}>Vencimiento del SOAT</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => setShowVencimiento(true)}>
                <Ionicons name="calendar-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
                <Text style={[styles.textInput, !fecha_Vencimiento && { color: T.input.placeholder }]}>
                  {fecha_Vencimiento || 'AA/MM/DD'}
                </Text>
              </TouchableOpacity>
              {showVencimiento && (
                <DateTimePicker value={new Date()} mode="date" onChange={onChangeVencimiento} />
              )}
            </View>
          )}

          {/* Botón Guardar */}
          <TouchableOpacity style={styles.btnPrimary} onPress={handleGuardar} disabled={cargando}>
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnPrimaryText}>Guardar bus</Text>
            }
          </TouchableOpacity>

          {/* Botón Cancelar */}
          <TouchableOpacity style={styles.btnSecondary} onPress={() => router.replace('/home')}>
            <Text style={styles.btnSecondaryText}>Cancelar</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Modal — Seleccionar Conductor */}
      <Modal visible={modalConductor} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Seleccionar Conductor</Text>
            <FlatList
              data={conductores}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => seleccionarConductor(item)}>
                  <Ionicons name="person-circle-outline" size={26} color={T.icon.active} />
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                  {conductorId === item.id && <Ionicons name="checkmark" size={18} color={T.Headers.innerColor} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.vacio}>No hay conductores disponibles</Text>
              }
            />
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalConductor(false)}>
              <Text style={styles.btnSecondaryText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal — Seleccionar Tipo de Vehículo */}
      <Modal visible={modalTipo} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitulo}>Tipo de Vehículo</Text>
            <FlatList
              data={tiposVehiculo}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => seleccionarTipo(item)}>
                  <Ionicons name="car-outline" size={26} color={T.icon.active} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemText}>{item.nombre}</Text>
                    {item.descripcion && (
                      <Text style={{ fontSize: 12, color: T.text.tertiary }}>{item.descripcion}</Text>
                    )}
                  </View>
                  {tipoId === item.id && <Ionicons name="checkmark" size={18} color={T.Headers.innerColor} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.vacio}>No hay tipos disponibles</Text>
              }
            />
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalTipo(false)}>
              <Text style={styles.btnSecondaryText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: T.background },

  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 6,
  },

  label:    { fontSize: 13, fontWeight: '600', color: T.text.secondary, marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  inputIcon:{ marginRight: 10 },
  textInput:{ flex: 1, fontSize: 15, color: T.text.primary },

  btnPrimary:     { backgroundColor: T.Button.primary.background, borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary:     { backgroundColor: T.Button.secondary.background, borderWidth: 1, borderColor: T.Button.secondary.border, borderRadius: 50, padding: 16, alignItems: 'center' },
  btnSecondaryText: { color: T.Button.secondary.text, fontWeight: '600', fontSize: 15 },

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalTitulo:    { fontSize: 18, fontWeight: 'bold', color: T.text.primary, marginBottom: 16 },
  modalItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.cards.border },
  modalItemText:  { fontSize: 16, color: T.text.primary },
  vacio:          { textAlign: 'center', color: T.text.tertiary, padding: 24 },
});