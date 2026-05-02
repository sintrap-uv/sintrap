import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  getRutaById, 
  getVehiculosDisponibles, 
  getTurnos, 
  getUsuariosDisponibles, 
  getParadasByRuta, 
  getAsignacionesRuta, 
  guardarAsignaciones, 
  verificarEstadoVehiculo,
  verificarConflictoHorario 
} from '../../services/rutaService';
import theme from '../../constants/theme';


const T = theme.lightMode;

export default function AsignarRecursosScreen() {
  const { id: rutaId } = useLocalSearchParams();
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('vehiculos');
  
  const [turnos, setTurnos] = useState([]);
  const [turnosSeleccionados, setTurnosSeleccionados] = useState(new Set());
  const [vehiculosPorTurno, setVehiculosPorTurno] = useState({});
  const [fechaOperacion, setFechaOperacion] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [usuariosDisponibles, setUsuariosDisponibles] = useState([]);
  const [paradas, setParadas] = useState([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState([]);
  const [capacidadVehiculo, setCapacidadVehiculo] = useState(0);
  
  const [modalVehiculosVisible, setModalVehiculosVisible] = useState(false);
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [vehiculosDisponibles, setVehiculosDisponibles] = useState([]);
  const [modalUsuariosVisible, setModalUsuariosVisible] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [origenSeleccionado, setOrigenSeleccionado] = useState(null);
  const [destinoSeleccionado, setDestinoSeleccionado] = useState(null);
  const [searchUsuario, setSearchUsuario] = useState('');

  useEffect(() => {
    if (rutaId) {
      cargarDatosIniciales();
    }
  }, [rutaId]);

  const cargarDatosIniciales = async () => {
    try {
      setLoading(true);
      
      const [rutaRes, turnosRes, usuariosRes, paradasRes, asignacionesRes] = await Promise.all([
        getRutaById(rutaId),
        getTurnos(),
        getUsuariosDisponibles(),
        getParadasByRuta(rutaId),
        getAsignacionesRuta(rutaId)
      ]);
      
      if (rutaRes.success) setRuta(rutaRes.data);
      if (turnosRes.success) setTurnos(turnosRes.data);
      if (usuariosRes.success) setUsuariosDisponibles(usuariosRes.data);
      if (paradasRes.success) setParadas(paradasRes.data);
      
      if (asignacionesRes.success) {
        const { horarios, usuarios } = asignacionesRes.data;
        
        const vehiculosMap = {};
        const turnosSet = new Set();
        horarios.forEach(h => {
          vehiculosMap[h.turno_id] = h.vehiculo;
          turnosSet.add(h.turno_id);
          if (h.vehiculo?.capacidad) {
            setCapacidadVehiculo(h.vehiculo.capacidad);
          }
        });
        setVehiculosPorTurno(vehiculosMap);
        setTurnosSeleccionados(turnosSet);
        
        const usuariosMap = usuarios.map(u => ({
            id: u.usuario_id || u.id,  // Asegura que no sea undefined
            nombre: u.usuario?.nombre || 'Sin nombre',
            cedula: u.usuario?.cedula || 'N/A',
            parada_origen_id: u.parada_origen_id,
            parada_destino_id: u.parada_destino_id
        }))
        .filter(u => u.id != null);
        setUsuariosAsignados(usuariosMap);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarTurno = async (turnoId) => {
    const nuevosTurnos = new Set(turnosSeleccionados);
    if (nuevosTurnos.has(turnoId)) {
      nuevosTurnos.delete(turnoId);
      const nuevosVehiculos = { ...vehiculosPorTurno };
      delete nuevosVehiculos[turnoId];
      setVehiculosPorTurno(nuevosVehiculos);
    } else {
      nuevosTurnos.add(turnoId);
    }
    setTurnosSeleccionados(nuevosTurnos);
  };

  const handleAbrirModalVehiculos = async (turno) => {
    if (!turno || !turno.id) {
    Alert.alert('Error', 'Turno no válido');
    return;
    }
    setTurnoSeleccionado(turno);
    const res = await getVehiculosDisponibles(fechaOperacion, turno.id, rutaId);
    if (res.success) {
      setVehiculosDisponibles(res.data);
      setModalVehiculosVisible(true);
    } else {
      Alert.alert('Error', 'No se pudieron cargar los vehículos');
    }
  };

  const handleSeleccionarVehiculo = async (vehiculo) => {
    const conflictoRes = await verificarConflictoHorario(
      vehiculo.id, 
      turnoSeleccionado.id, 
      fechaOperacion, 
      rutaId
    );
    
    if (conflictoRes.tieneConflicto) {
      Alert.alert(
        'Conflicto de horario',
        `El vehículo ${vehiculo.placa} ya está asignado a ${conflictoRes.rutaConflicto} en este horario`
      );
      return;
    }
    
    const estado = verificarEstadoVehiculo(vehiculo);
    if (!estado.valido) {
      Alert.alert(
        'Advertencia',
        `El vehículo tiene problemas:\n${estado.advertencias.join('\n')}\n¿Deseas asignarlo de todos modos?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Asignar', 
            onPress: () => {
              setVehiculosPorTurno({
                ...vehiculosPorTurno,
                [turnoSeleccionado.id]: vehiculo
              });
              setCapacidadVehiculo(vehiculo.capacidad);
              setModalVehiculosVisible(false);
            }
          }
        ]
      );
    } else {
      setVehiculosPorTurno({
        ...vehiculosPorTurno,
        [turnoSeleccionado.id]: vehiculo
      });
      setCapacidadVehiculo(vehiculo.capacidad);
      setModalVehiculosVisible(false);
    }
  };

  const handleAgregarUsuario = () => {
    if (!usuarioSeleccionado || !origenSeleccionado || !destinoSeleccionado) {
      Alert.alert('Error', 'Complete todos los campos');
      return;
    }
    
    if (usuariosAsignados.length >= capacidadVehiculo && capacidadVehiculo > 0) {
      Alert.alert(
        'Capacidad llena',
        'El vehículo ha alcanzado su capacidad máxima.'
      );
      return;
    }
    
    setUsuariosAsignados([
      ...usuariosAsignados,
      {
        id: usuarioSeleccionado.id,
        nombre: usuarioSeleccionado.nombre,
        cedula: usuarioSeleccionado.cedula,
        parada_origen_id: origenSeleccionado.id,
        parada_destino_id: destinoSeleccionado.id,
        origen_nombre: origenSeleccionado.nombre,
        destino_nombre: destinoSeleccionado.nombre
      }
    ]);
    
    setUsuarioSeleccionado(null);
    setOrigenSeleccionado(null);
    setDestinoSeleccionado(null);
    setModalUsuariosVisible(false);
  };

  const handleEliminarUsuario = (index) => {
  if (index >= 0 && usuariosAsignados[index]) {
    const nuevos = [...usuariosAsignados];
    nuevos.splice(index, 1);
    setUsuariosAsignados(nuevos);
  }
};

  const handleGuardar = async () => {
    if (Object.keys(vehiculosPorTurno).length === 0) {
      Alert.alert('Error', 'Debe asignar al menos un vehículo a un turno');
      return;
    }
    
    if (turnosSeleccionados.size === 0) {
      Alert.alert('Error', 'Debe seleccionar al menos un horario');
      return;
    }
    
    setSaving(true);
    
    const vehiculosAsignacion = Object.entries(vehiculosPorTurno).map(([turnoId, vehiculo]) => ({
      turnoId,
      vehiculoId: vehiculo.id,
      fecha: fechaOperacion
    }));
    
    const usuariosAsignacion = usuariosAsignados.map(u => ({
      usuarioId: u.id,
      paradaOrigenId: u.parada_origen_id,
      paradaDestinoId: u.parada_destino_id
    }));
    
    const result = await guardarAsignaciones(rutaId, {
      vehiculosPorTurno: vehiculosAsignacion,
      usuarios: usuariosAsignacion
    });
    
    setSaving(false);
    
    if (result.success) {
      Alert.alert('Éxito', 'Recursos asignados correctamente', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      Alert.alert('Error', 'No se pudieron guardar las asignaciones');
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.Button.primary.background} />
      </View>
    );
  }

  const capacidadRestante = capacidadVehiculo - usuariosAsignados.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Asignar Recursos</Text>
          <Text style={styles.headerSub}>
            Ruta {ruta?.numero_ruta}: {ruta?.nombre}
          </Text>
        </View>
      </View>
      
      <View style={styles.tabBar} removeClippedSubviews={false}>
        {['vehiculos', 'horarios', 'usuarios'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'vehiculos' && '🚌 Vehículos'}
              {tab === 'horarios' && '⏰ Horarios'}
              {tab === 'usuarios' && '👥 Usuarios'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={false}
        >
        {activeTab === 'vehiculos' && (
          <View>
            <View style={styles.datePickerRow}>
              <Text style={styles.label}>Fecha de operación</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={20} color={T.Button.primary.background} />
                <Text style={styles.dateText}>{fechaOperacion}</Text>
              </TouchableOpacity>
            </View>
            
            {showDatePicker && (
              <DateTimePicker
                value={new Date(fechaOperacion)}
                mode="date"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setFechaOperacion(date.toISOString().split('T')[0]);
                  }
                }}
              />
            )}
            
            <Text style={styles.sectionTitle}>Turnos seleccionados</Text>
            {Array.from(turnosSeleccionados).map(turnoId => {
              const turno = turnos.find(t => String(t.id) === String(turnoId));
              const vehiculo = vehiculosPorTurno[turnoId];
              if (!turno) {
                return null;
            }
              return (
                <View key={turnoId} style={styles.vehiculoCard}>
                  <View style={styles.vehiculoHeader}>
                    <Text style={styles.turnoNombre}>Turno {turno.nombre}</Text>
                    <Text style={styles.turnoHorario}>
                      {turno?.hora_inicio} - {turno?.hora_fin}
                    </Text>
                  </View>
                  
                  {vehiculo ? (
                    <View style={styles.vehiculoInfo}>
                      <View>
                        <Text style={styles.vehiculoPlaca}>{vehiculo.placa}</Text>
                        <Text style={styles.vehiculoDetalle}>
                          Tipo: {vehiculo.tipo_vehiculo?.nombre || 'N/A'} | Capacidad: {vehiculo.capacidad}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={styles.cambiarBtn}
                        onPress={() => handleAbrirModalVehiculos(turno)}
                      >
                        <Text style={styles.cambiarBtnText}>Cambiar</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.asignarBtn}
                      onPress={() => handleAbrirModalVehiculos(turno)}
                    >
                      <Text style={styles.asignarBtnText}>+ Asignar vehículo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            
            {turnosSeleccionados.size === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Ve a la pestaña "Horarios" y selecciona al menos un turno
                </Text>
              </View>
            )}
          </View>
        )}
        
        {activeTab === 'horarios' && (
          <View>
            <Text style={styles.sectionTitle}>Selecciona los turnos</Text>
            {turnos.map((turno) => (
              <TouchableOpacity 
                key={turno.id}
                style={[
                  styles.turnoCard,
                  turnosSeleccionados.has(turno.id) && styles.turnoCardSelected
                ]}
                onPress={() => handleSeleccionarTurno(turno.id)}
              >
                <View style={styles.turnoCardContent}>
                  <View style={styles.turnoCheckbox}>
                    {turnosSeleccionados.has(turno.id) && (
                      <Ionicons name="checkmark-circle" size={24} color="#22C55E" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.turnoCardNombre}>Turno {turno.nombre}</Text>
                    <Text style={styles.turnoCardHorario}>
                      {turno.hora_inicio} - {turno.hora_fin}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {activeTab === 'usuarios' && (
          <View>
            {capacidadVehiculo > 0 && (
              <View style={styles.capacidadCard}>
                <Text style={styles.capacidadText}>
                  Capacidad del vehículo: {capacidadVehiculo} personas
                </Text>
                <Text style={[styles.capacidadText, { color: capacidadRestante > 0 ? '#22C55E' : '#EF4444' }]}>
                  Disponibles: {capacidadRestante}
                </Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.agregarUsuarioBtn}
              onPress={() => setModalUsuariosVisible(true)}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.agregarUsuarioBtnText}>Agregar usuario</Text>
            </TouchableOpacity>
            
            <Text style={styles.sectionTitle}>Usuarios asignados ({usuariosAsignados.length})</Text>
            
            {usuariosAsignados.filter(Boolean).map((usuario, index) => (
                <View key={usuario?.id || index} style={styles.usuarioCard}>
                    <View style={styles.usuarioInfo}>
                        <View style={styles.usuarioAvatar}>
                            <Text style={styles.usuarioAvatarText}>
                                {usuario.nombre?.charAt(0) || '?'}
                            </Text>
                        </View>
      
                        <View style={{ flex: 1 }}>
                            <Text style={styles.usuarioNombre}>
                                {usuario.nombre || 'Usuario'}
                            </Text>
                            <Text style={styles.usuarioCedula}>
                                Cédula: {usuario.cedula || 'N/A'}
                            </Text>
                        </View>
      
                        <TouchableOpacity onPress={() => handleEliminarUsuario(index)}>
                            <Ionicons name="trash-outline" size={22} color="#EF4444" />
                        </TouchableOpacity>
                    </View>
                </View>
                ))}

            
            {usuariosAsignados.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No hay usuarios asignados</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.guardarBtn} onPress={handleGuardar} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.guardarBtnText}>Guardar asignaciones</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <Modal visible={modalVehiculosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Seleccionar vehículo</Text>
            <FlatList
              data={vehiculosDisponibles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => handleSeleccionarVehiculo(item)}
                >
                  <MaterialCommunityIcons name="bus" size={24} color={T.Button.primary.background} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{item.placa}</Text>
                    <Text style={styles.modalItemSub}>
                      {item.tipo_vehiculo?.nombre} | Cap: {item.capacidad}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No hay vehículos disponibles</Text>}
            />
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setModalVehiculosVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      <Modal visible={modalUsuariosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Agregar usuario</Text>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuario..."
              placeholderTextColor="#9CA3AF"
              value={searchUsuario}
              onChangeText={setSearchUsuario}
            />
            
            <Text style={styles.modalSubtitle}>Seleccionar usuario</Text>
            <FlatList
              data={usuariosDisponibles.filter(u => 
                u.nombre?.toLowerCase().includes(searchUsuario.toLowerCase()) ||
                u.cedula?.includes(searchUsuario)
              )}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.modalItem,
                    usuarioSeleccionado?.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => setUsuarioSeleccionado(item)}
                >
                  <View style={styles.usuarioAvatar}>
                    <Text style={styles.usuarioAvatarText}>{item.nombre?.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.modalItemTitle}>{item.nombre}</Text>
                    <Text style={styles.modalItemSub}>Cédula: {item.cedula}</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 200 }}
            />
            
            <Text style={styles.modalSubtitle}>Parada de origen</Text>
            <FlatList
              data={paradas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.modalItem,
                    origenSeleccionado?.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => setOrigenSeleccionado(item)}
                >
                  <Text>{item.nombre}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 150 }}
            />
            
            <Text style={styles.modalSubtitle}>Parada de destino</Text>
            <FlatList
              data={paradas}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.modalItem,
                    destinoSeleccionado?.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => setDestinoSeleccionado(item)}
                >
                  <Text>{item.nombre}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 150 }}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalUsuariosVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleAgregarUsuario}
              >
                <Text style={styles.modalBtnConfirmText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: {
    backgroundColor: T.Button.primary.background,
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 12, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: T.Button.primary.background },
  tabText: { fontSize: 14, color: '#6B7280' },
  tabTextActive: { color: T.Button.primary.background, fontWeight: '600' },
  
  content: { flex: 1, padding: 16 },
  
  datePickerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '500', color: T.text.secondary },
  dateButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  dateText: { fontSize: 14, color: T.text.primary },
  
  sectionTitle: { fontSize: 16, fontWeight: '600', color: T.text.primary, marginBottom: 12, marginTop: 8 },
  
  turnoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  turnoCardSelected: { borderColor: T.Button.primary.background, backgroundColor: '#F0FDF4' },
  turnoCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  turnoCheckbox: { width: 24 },
  turnoCardNombre: { fontSize: 16, fontWeight: '500', color: T.text.primary },
  turnoCardHorario: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  
  vehiculoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  vehiculoHeader: { marginBottom: 12 },
  turnoNombre: { fontSize: 14, fontWeight: '600', color: T.text.primary },
  turnoHorario: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  vehiculoInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vehiculoPlaca: { fontSize: 15, fontWeight: '600', color: T.text.primary },
  vehiculoDetalle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cambiarBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F3F4F6' },
  cambiarBtnText: { fontSize: 13, color: T.Button.primary.background },
  asignarBtn: { borderWidth: 1, borderColor: T.Button.primary.background, borderStyle: 'dashed', borderRadius: 8, padding: 12, alignItems: 'center' },
  asignarBtnText: { color: T.Button.primary.background, fontWeight: '500' },
  
  capacidadCard: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between' },
  capacidadText: { fontSize: 14, fontWeight: '500' },
  
  agregarUsuarioBtn: { backgroundColor: T.Button.primary.background, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  agregarUsuarioBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  
  usuarioCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  usuarioInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  usuarioAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center' },
  usuarioAvatarText: { fontSize: 18, fontWeight: '600', color: T.Button.primary.background },
  usuarioNombre: { fontSize: 15, fontWeight: '500', color: T.text.primary },
  usuarioCedula: { fontSize: 12, color: '#6B7280' },
  
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyStateText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  guardarBtn: { backgroundColor: T.Button.primary.background, borderRadius: 12, padding: 16, alignItems: 'center' },
  guardarBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: T.text.primary, marginBottom: 16 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', color: T.text.primary, marginTop: 12, marginBottom: 8 },
  modalItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalItemSelected: { backgroundColor: '#F0FDF4' },
  modalItemTitle: { fontSize: 15, fontWeight: '500', color: T.text.primary },
  modalItemSub: { fontSize: 12, color: '#6B7280' },
  modalCloseBtn: { marginTop: 16, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#F3F4F6' },
  modalCloseBtnText: { color: T.text.primary, fontWeight: '500' },
  searchInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnCancel: { backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: '#6B7280' },
  modalBtnConfirm: { backgroundColor: T.Button.primary.background },
  modalBtnConfirmText: { color: '#fff', fontWeight: '500' },
  emptyText: { textAlign: 'center', padding: 20, color: '#9CA3AF' }
});
