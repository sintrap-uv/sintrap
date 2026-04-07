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
import { getProfile } from '../../services/profileService';
import { getCurrentUser } from '../../services/auth';
import { getAvailableDrivers, registerVehicle } from '../../services/vehicleService';
import theme from '../../constants/theme';

const T = theme.lightMode;

export default function RegistrarVehiculo() {
  const [placa, setPlaca] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [conductorId, setConductorId] = useState(null);
  const [conductorNombre, setConductorNombre] = useState('');
  const [conductores, setConductores] = useState([]);
  const [fecha_Inicio, setFecha_Inicio] = useState('');
  const [fecha_Vencimiento, setFecha_Vencimiento] = useState('');
  const [seguro, setSeguro] = useState(false);
  const [showInicio, setShowInicio] = useState(false);
  const [showVencimiento, setShowVencimiento] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const inicializar = async () => {
      try {
        const user = await getCurrentUser();
        await getProfile(user.id);
        const drivers = await getAvailableDrivers();
        setConductores(drivers);
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
    if (seguro && !fecha_Inicio) {
      Alert.alert('Error', 'Debes seleccionar una fecha')
      return false;
    }
    if (seguro && !fecha_Vencimiento) {
      Alert.alert('Error', 'Debes seleccionar la fecha cuando se vence el SOAT')
      return false;
    }
    if (!capacidad) {
      Alert.alert('Error', 'Debes seleccionar cuanta gente cabe en el bus')
      return false;
    }
    return true;
  };

  const onChangeInicio = (event, selectedDate) => {
    //ceramos el piker de vencimiento (osea la fecha de vencimiento)
    setShowInicio(false);

    if (selectedDate) {
      //Formato para mandar a supabase
      const fechaFormateada = selectedDate.toISOString().split('T')[0];
      setFecha_Inicio(fechaFormateada);
    }


  };

  const onChangeVencimiento = (event, selectedDate) => {
    //ceramos el piker de vencimiento (osea la fecha de vencimiento)
    setShowVencimiento(false);

    if (selectedDate) {
      //Formato para mandar a supabase
      const fechaFormateada = selectedDate.toISOString().split('T')[0];
      setFecha_Vencimiento(fechaFormateada);
    }
  };

  const handleGuardar = async () => {
    if (!validar()) return;
    setCargando(true);
    try {
      await registerVehicle({
        placa: placa.trim().toUpperCase(),
        capacidad: capacidad,
        conductor_id: conductorId,
        seguro: seguro,
        fecha_inicio:seguro? fecha_Inicio : null,
        fecha_vencimiento: seguro ? fecha_Vencimiento : null,
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
    setModalVisible(false);
  };

  return (
    <View style={styles.screen}>



      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Tarjeta blanca */}
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

          {/* Capacidad */}
          <Text style={styles.label}> Capacidad del vehículo</Text>
          <View style={styles.inputRow}>
            <Ionicons name="people-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              keyboardType="numeric"
              placeholder="20"
              placeholderTextColor={T.input.placeholder}
              value={capacidad}
              onChangeText={(text) => setCapacidad(text.toUpperCase())}
            />
          </View>

          {/* Conductor */}
          <Text style={styles.label}>Conductor</Text>
          <TouchableOpacity style={styles.inputRow} onPress={() => setModalVisible(true)}>
            <Ionicons name="person-outline" size={18} color={T.icon.default} style={styles.inputIcon} />
            <Text style={[styles.textInput, !conductorId && { color: T.input.placeholder }]}>
              {conductorNombre || 'Seleccionar conductor'}
            </Text>
          </TouchableOpacity>

          {/*seguro*/}
          <Text style={styles.label}>Seguro</Text>
          <View style={styles.inputRow}>
            <Ionicons name='shield-outline' size={18} color={T.icon.default} style={styles.inputIcon} />
            <Text style={{ flex: 1, color: T.text.primary }}>¿Tiene SOAT?</Text>
            <Switch
              value={seguro}
              onValueChange={(valor) => {
                setSeguro(valor)
              }}
            />
          </View>

          {seguro && (
            <View>
              {/*fecha de inicio del soat */}
              <Text style={styles.label}>Inicio del soat</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => setShowInicio(true)}>
                <Ionicons name='calendar-outline' size={18} color={T.icon.default} style={styles.inputIcon} />
                <Text style={styles.textInput}>
                  {fecha_Inicio || 'AA/MM/DD'}
                </Text>
              </TouchableOpacity>
              {
                showInicio && (
                  <DateTimePicker
                    value={new Date()}
                    mode='date'
                    onChange={onChangeInicio}
                  />
                )
              }

              {/*fechas de vencimiento del soat  */}
              <Text style={styles.label}>Vencimiento del soat</Text>
              <TouchableOpacity style={styles.inputRow} onPress={() => setShowVencimiento(true)}>
                <Ionicons name='calendar-outline' size={18} color={T.icon.default} style={styles.inputIcon} />
                <Text style={styles.textInput}>
                  {fecha_Vencimiento || 'AA/MM/DD'}
                </Text>
              </TouchableOpacity>

              {showVencimiento && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  onChange={onChangeVencimiento}
                />
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

      {/* Modal conductores */}
      <Modal visible={modalVisible} transparent animationType="slide">
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
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.vacio}>No hay conductores disponibles</Text>
              }
            />
            <TouchableOpacity style={styles.btnSecondary} onPress={() => setModalVisible(false)}>
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

  // Header
  header: {
    backgroundColor: T.Button.primary.background,
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  // Scroll y tarjeta
  scroll: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },

  // Inputs
  label: { fontSize: 13, fontWeight: '600', color: T.text.secondary, marginBottom: 6, marginTop: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.background, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  inputIcon: { marginRight: 10 },
  textInput: { flex: 1, fontSize: 15, color: T.text.primary },

  // Botones
  btnPrimary: { backgroundColor: T.Button.primary.background, borderRadius: 50, padding: 16, alignItems: 'center', marginTop: 20, marginBottom: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSecondary: { backgroundColor: T.Button.secondary.background, borderWidth: 1, borderColor: T.Button.secondary.border, borderRadius: 50, padding: 16, alignItems: 'center' },
  btnSecondaryText: { color: T.Button.secondary.text, fontWeight: '600', fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '60%' },
  modalTitulo: { fontSize: 18, fontWeight: 'bold', color: T.text.primary, marginBottom: 16 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.cards.border },
  modalItemText: { fontSize: 16, color: T.text.primary },
  vacio: { textAlign: 'center', color: T.text.tertiary, padding: 24 },
});