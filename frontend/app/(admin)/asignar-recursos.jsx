import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  FlatList,
  LogBox
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
  verificarConflictoHorario,
  eliminarAsignacionTurno
} from '../../services/rutaServices';
import theme from '../../constants/theme';
import { asignarRecursosStyles as styles } from '../../components/AsignarRecursosStyles';

LogBox.ignoreLogs(['Each child in a list should have a unique "key" prop']);

const T = theme.lightMode;

export default function AsignarRecursosScreen() {
  const { id: rutaId } = useLocalSearchParams();
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('horarios');
  
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
  const [turnoSeleccionadoUsuario, setTurnoSeleccionadoUsuario] = useState(null);
  const [editandoUsuarioIndex, setEditandoUsuarioIndex] = useState(null);

  useEffect(() => {
    if (rutaId) {
      cargarDatosIniciales();
    }
  }, [rutaId]);

  useEffect(() => {
    if (turnosSeleccionados.has(null)) {
      const nuevosTurnos = new Set(turnosSeleccionados);
      nuevosTurnos.delete(null);
      setTurnosSeleccionados(nuevosTurnos);
    }
  }, [turnosSeleccionados]);

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
      if (paradasRes.success) {
        setParadas(paradasRes.data);
      }
      
      if (asignacionesRes.success) {
        const { horarios, usuarios } = asignacionesRes.data;
        
        const vehiculosMap = {};
        const turnosSet = new Set();
        horarios.forEach(h => {
          const turnoId = h.tipo_turno_id || h.turno_id;
          vehiculosMap[turnoId] = h.vehiculo;
          turnosSet.add(turnoId);
        });
        setVehiculosPorTurno(vehiculosMap);
        setTurnosSeleccionados(turnosSet);
        
        const usuariosMap = usuarios
          .map(u => ({
            id: u.usuario_id || u.id,
            nombre: u.usuario?.nombre || 'Sin nombre',
            cedula: u.usuario?.cedula || 'N/A',
            turno_id: u.turno_id,
            parada_origen_id: u.parada_origen_id,
            parada_destino_id: u.parada_destino_id,
            origen_nombre: u.origen_nombre || 'Sin origen',
            destino_nombre: u.destino_nombre || 'Sin destino'
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
    let nuevosTurnos = new Set(turnosSeleccionados);
    if (nuevosTurnos.has(null)) {
      nuevosTurnos.delete(null);
    }
    
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
    
    const asignarVehiculo = () => {
      const turnoId = turnoSeleccionado.id;
      
      let capacidadObtenida = 0;
      
      if (vehiculo.tipo_vehiculo && vehiculo.tipo_vehiculo.capacidad_max) {
        capacidadObtenida = parseInt(vehiculo.tipo_vehiculo.capacidad_max);
      } else if (vehiculo.capacidad) {
        capacidadObtenida = parseInt(vehiculo.capacidad);
      }
      
      setVehiculosPorTurno(prev => ({
        ...prev,
        [turnoId]: vehiculo
      }));
      setCapacidadVehiculo(capacidadObtenida);
      setModalVehiculosVisible(false);
      
      Alert.alert('Éxito', `Vehículo ${vehiculo.placa} asignado (Capacidad: ${capacidadObtenida} personas)`);
    };
    
    if (!estado.valido) {
      Alert.alert(
        '⚠️ Vehículo no disponible',
        `No se puede asignar este vehículo por las siguientes razones:\n\n${estado.advertencias.join('\n')}`,
        [{ text: 'OK' }]
      );
      return;
    } else {
      asignarVehiculo();
    }
  };

  const handleEliminarAsignacion = (turnoId) => {
    Alert.alert(
      'Eliminar asignación',
      '¿Estás seguro de que deseas eliminar el vehículo asignado a este turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Eliminar', 
          style: 'destructive',
          onPress: async () => {
            const result = await eliminarAsignacionTurno(rutaId, turnoId, fechaOperacion);
            
            if (result.success) {
              const nuevosVehiculos = { ...vehiculosPorTurno };
              delete nuevosVehiculos[turnoId];
              setVehiculosPorTurno(nuevosVehiculos);
              
              if (Object.keys(nuevosVehiculos).length === 0) {
                setCapacidadVehiculo(0);
              }
              
              Alert.alert('Éxito', 'Asignación eliminada correctamente');
            } else {
              Alert.alert('Error', 'No se pudo eliminar la asignación');
            }
          }
        }
      ]
    );
  };

  const handleEditarUsuario = (usuario, index) => {
    setUsuarioSeleccionado({
      id: usuario.id,
      nombre: usuario.nombre,
      cedula: usuario.cedula
    });
    setTurnoSeleccionadoUsuario(turnos.find(t => t.id === usuario.turno_id));
    setOrigenSeleccionado({ id: usuario.parada_origen_id, nombre: usuario.origen_nombre });
    setDestinoSeleccionado({ id: usuario.parada_destino_id, nombre: usuario.destino_nombre });
    setEditandoUsuarioIndex(index);
    setModalUsuariosVisible(true);
  };

  const handleAgregarUsuario = () => {
  if (!turnoSeleccionadoUsuario) {
    Alert.alert('Error', 'Debes seleccionar un turno');
    return;
  }
  
  if (!usuarioSeleccionado || !origenSeleccionado || !destinoSeleccionado) {
    Alert.alert('Error', 'Complete todos los campos');
    return;
  }
  
  // VALIDAR QUE ORIGEN Y DESTINO SEAN DIFERENTES
  if (origenSeleccionado.id === destinoSeleccionado.id) {
    Alert.alert('Error', 'La parada de origen y destino no pueden ser la misma');
    return;
  }
  
  // Si estamos editando
  if (editandoUsuarioIndex !== null) {
    const nuevosUsuarios = [...usuariosAsignados];
    nuevosUsuarios[editandoUsuarioIndex] = {
      ...nuevosUsuarios[editandoUsuarioIndex],
      turno_id: turnoSeleccionadoUsuario.id,
      turno_nombre: turnoSeleccionadoUsuario.nombre,
      parada_origen_id: origenSeleccionado.id,
      parada_destino_id: destinoSeleccionado.id,
      origen_nombre: origenSeleccionado.nombre,
      destino_nombre: destinoSeleccionado.nombre
    };
    setUsuariosAsignados(nuevosUsuarios);
    setEditandoUsuarioIndex(null);
  } else {
    // Verificar si el usuario ya está asignado al mismo turno
    const usuarioYaAsignado = usuariosAsignados.some(u => 
      u.id === usuarioSeleccionado.id && u.turno_id === turnoSeleccionadoUsuario.id
    );
    if (usuarioYaAsignado) {
      Alert.alert('Error', 'Este usuario ya está asignado a este turno');
      return;
    }
    
    const vehiculoTurno = vehiculosPorTurno[turnoSeleccionadoUsuario.id];
    const capacidadTurno = vehiculoTurno?.tipo_vehiculo?.capacidad_max || 0;
    const usuariosEnTurno = usuariosAsignados.filter(u => u.turno_id === turnoSeleccionadoUsuario.id).length;
    
    if (capacidadTurno > 0 && usuariosEnTurno >= capacidadTurno) {
      Alert.alert(
        'Capacidad llena',
        `El vehículo del turno ${turnoSeleccionadoUsuario.nombre} tiene capacidad para ${capacidadTurno} personas. Ya está lleno.`
      );
      return;
    }
    
    setUsuariosAsignados([
      ...usuariosAsignados,
      {
        id: usuarioSeleccionado.id,
        nombre: usuarioSeleccionado.nombre,
        cedula: usuarioSeleccionado.cedula,
        turno_id: turnoSeleccionadoUsuario.id,
        turno_nombre: turnoSeleccionadoUsuario.nombre,
        parada_origen_id: origenSeleccionado.id,
        parada_destino_id: destinoSeleccionado.id,
        origen_nombre: origenSeleccionado.nombre,
        destino_nombre: destinoSeleccionado.nombre
      }
    ]);
  }
  
  setTurnoSeleccionadoUsuario(null);
  setUsuarioSeleccionado(null);
  setOrigenSeleccionado(null);
  setDestinoSeleccionado(null);
  setModalUsuariosVisible(false);
};

  const handleEliminarUsuario = (index) => {
    const nuevos = [...usuariosAsignados];
    nuevos.splice(index, 1);
    setUsuariosAsignados(nuevos);
  };

  const handleGuardar = async () => {
    const turnosValidos = Array.from(turnosSeleccionados).filter(id => id !== null);
    
    if (turnosValidos.length === 0) {
      Alert.alert('Error', 'Debe seleccionar al menos un horario');
      return;
    }
    
    const turnosSinVehiculo = turnosValidos.filter(turnoId => {
      return !vehiculosPorTurno[turnoId];
    });
    
    if (turnosSinVehiculo.length > 0) {
      const nombresTurnos = turnosSinVehiculo.map(id => {
        const turno = turnos.find(t => t.id === id);
        return turno?.nombre || `Turno ${id}`;
      });
      Alert.alert('Error', `Los siguientes turnos no tienen vehículo asignado:\n${nombresTurnos.join('\n')}`);
      return;
    }
    
    setSaving(true);
    
    const vehiculosAsignacion = turnosValidos
      .map(turnoId => {
        const vehiculo = vehiculosPorTurno[turnoId];
        if (!vehiculo) return null;
        return {
          turnoId: parseInt(turnoId),
          vehiculoId: vehiculo.id,
          fecha: fechaOperacion
        };
      })
      .filter(item => item !== null);
    
    const usuariosAsignacion = usuariosAsignados
      .filter(u => u && u.id)
      .map(u => ({
        usuarioId: u.id,
        turnoId: u.turno_id,
        paradaOrigenId: parseInt(u.parada_origen_id),
        paradaDestinoId: parseInt(u.parada_destino_id)
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
      Alert.alert('Error', 'No se pudieron guardar las asignaciones: ' + (result.error || 'Error desconocido'));
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={T.Button.primary.background} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Asignar Ruta</Text>
          <Text style={styles.headerSub}>
            Ruta {ruta?.numero_ruta}: {ruta?.nombre}
          </Text>
        </View>
      </View>
      
      <View style={styles.tabBar}>
        {['horarios', 'vehiculos', 'usuarios'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <View style={styles.tabContent}>
              <Ionicons 
                name={
                  tab === 'horarios' ? 'calendar-outline' :
                  tab === 'vehiculos' ? 'car-outline' : 'people-outline'
                } 
                size={20} 
                color={activeTab === tab ? T.Button.primary.background : '#6B7280'} 
              />
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'horarios' && 'Horarios'}
                {tab === 'vehiculos' && 'Vehículos'}
                {tab === 'usuarios' && 'Usuarios'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
            
            {Array.from(turnosSeleccionados)
              .filter(turnoId => turnoId !== null)
              .map(turnoId => {
                const turno = turnos.find(t => t.id === turnoId);
                const vehiculo = vehiculosPorTurno[turnoId];
                
                if (!turno) return null;
                
                return (
                  <View key={turnoId} style={styles.vehiculoCard}>
                    <View style={styles.vehiculoHeader}>
                      <Text style={styles.turnoNombre}>Turno {turno.nombre}</Text>
                      <Text style={styles.turnoHorario}>
                        {turno.hora_inicio} - {turno.hora_fin}
                      </Text>
                    </View>
                    
                    {vehiculo ? (
                      <View style={styles.vehiculoInfo}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.vehiculoPlaca}>{vehiculo.placa}</Text>
                          <Text style={styles.vehiculoDetalle}>
                            Tipo: {vehiculo.tipo_vehiculo?.nombre || 'N/A'} | Capacidad: {vehiculo.tipo_vehiculo?.capacidad_max || vehiculo.capacidad || '?'}
                          </Text>
                        </View>
                        <View style={styles.vehiculoAcciones}>
                          <TouchableOpacity 
                            style={styles.cambiarBtn}
                            onPress={() => handleAbrirModalVehiculos(turno)}
                          >
                            <Text style={styles.cambiarBtnText}>Cambiar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.eliminarBtn}
                            onPress={() => handleEliminarAsignacion(turno.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
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
        
        {/* SECCIÓN USUARIOS - CON BOTÓN DE EDITAR */}
        {activeTab === 'usuarios' && (
          <View>
            <TouchableOpacity
              style={styles.agregarUsuarioGlobalBtn}
              onPress={() => {
                setEditandoUsuarioIndex(null);
                setModalUsuariosVisible(true);
              }}
            >
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.agregarUsuarioBtnText}>Agregar usuario</Text>
            </TouchableOpacity>

            {Array.from(turnosSeleccionados).map(turnoId => {
              const turno = turnos.find(t => t.id === turnoId);
              if (!turno) return null;
              
              const vehiculoTurno = vehiculosPorTurno[turnoId];
              const capacidadTurno = vehiculoTurno?.tipo_vehiculo?.capacidad_max || 0;
              const usuariosDelTurno = usuariosAsignados.filter(u => u.turno_id === turnoId);
              const cuposDisponibles = capacidadTurno - usuariosDelTurno.length;
              
              return (
                <View key={turnoId} style={styles.turnoContainer}>
                  <View style={styles.turnoHeaderCard}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color={T.Button.primary.background} />
                    <Text style={styles.turnoHeaderTitle}>Turno {turno.nombre}</Text>
                    <Text style={styles.turnoHeaderHorario}>
                      {turno.hora_inicio?.slice(0,5)} - {turno.hora_fin?.slice(0,5)}
                    </Text>
                  </View>
                  
                  <View style={styles.capacidadCard}>
                    <View style={styles.capacidadFila}>
                      <Text style={styles.capacidadLabel}>Capacidad del vehículo:</Text>
                      <Text style={styles.capacidadValor}>{capacidadTurno} personas</Text>
                    </View>
                    <View style={styles.capacidadFila}>
                      <Text style={styles.capacidadLabel}>Asignados:</Text>
                      <Text style={[styles.capacidadValor, { color: cuposDisponibles > 0 ? '#22C55E' : '#EF4444' }]}>
                        {usuariosDelTurno.length}
                      </Text>
                    </View>
                    <View style={styles.capacidadFila}>
                      <Text style={styles.capacidadLabel}>Estado:</Text>
                      <Text style={[styles.capacidadEstado, { color: cuposDisponibles > 0 ? '#22C55E' : '#EF4444' }]}>
                        {cuposDisponibles > 0 ? `Disponibles: ${cuposDisponibles}` : 'LLENO'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Usuarios del turno con botón de editar */}
                  {usuariosDelTurno.length > 0 ? (
                    usuariosDelTurno.map((usuario, idx) => (
                      <View key={`${usuario.id}_${usuario.turno_id}`} style={styles.usuarioCard}>
                        <View style={styles.usuarioInfo}>
                          <View style={styles.usuarioAvatar}>
                            <Text style={styles.usuarioAvatarText}>
                              {usuario.nombre?.charAt(0) || '?'}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.usuarioNombre}>{usuario.nombre || 'Usuario'}</Text>
                            <Text style={styles.usuarioCedula}>Cédula: {usuario.cedula || 'N/A'}</Text>
                            <Text style={styles.usuarioRecorrido}>
                              {usuario.origen_nombre} → {usuario.destino_nombre}
                            </Text>
                          </View>
                          <View style={styles.usuarioAcciones}>
                            <TouchableOpacity 
                              style={styles.usuarioEditarBtn} 
                              onPress={() => handleEditarUsuario(usuario, usuariosAsignados.findIndex(u => u.id === usuario.id))}
                            >
                              <Ionicons name="pencil-outline" size={20} color={T.Button.primary.background} />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.usuarioEliminarBtn} 
                              onPress={() => handleEliminarUsuario(usuariosAsignados.findIndex(u => u.id === usuario.id))}
                            >
                              <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.sinUsuariosTexto}>No hay usuarios asignados a este turno</Text>
                  )}
                </View>
              );
            })}
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
      
      {/* Modal de vehículos */}
      <Modal visible={modalVehiculosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Seleccionar vehículo</Text>
            <FlatList
              data={vehiculosDisponibles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                const estadoVehiculo = verificarEstadoVehiculo(item);
                const tieneAlerta = !estadoVehiculo.valido;
                const noTieneConductor = !item.conductor_id;
                
                return (
                  <TouchableOpacity 
                    style={[
                      styles.modalItem,
                      tieneAlerta && styles.modalItemWarning
                    ]}
                    onPress={() => handleSeleccionarVehiculo(item)}
                  >
                    <MaterialCommunityIcons 
                      name={tieneAlerta ? "alert-circle" : "bus"} 
                      size={24} 
                      color={tieneAlerta ? "#EF4444" : T.Button.primary.background} 
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{item.placa}</Text>
                      <Text style={styles.modalItemSub}>
                        {item.tipo_vehiculo?.nombre || 'N/A'} | 
                        Cap: {item.tipo_vehiculo?.capacidad_max || item.capacidad || '?'}
                        {item.conductor && ` | Conductor: ${item.conductor.nombre}`}
                      </Text>
                      {noTieneConductor && (
                        <Text style={{ color: "#EF4444", fontSize: 11, marginTop: 2 }}>
                          ⚠️ Sin conductor asignado
                        </Text>
                      )}
                      {tieneAlerta && !noTieneConductor && (
                        <Text style={{ color: "#EF4444", fontSize: 11, marginTop: 2 }}>
                          ⚠️ {estadoVehiculo.advertencias[0]}
                        </Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                );
              }}
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
      
      {/* Modal de usuarios con selector de turno y modo edición */}
      <Modal visible={modalUsuariosVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>
              {editandoUsuarioIndex !== null ? 'Editar usuario' : 'Agregar usuario'}
            </Text>
            
            <Text style={styles.modalSubtitle}>Seleccionar turno</Text>
            <View style={styles.turnosSelector}>
              {turnosSeleccionados.size > 0 ? (
                Array.from(turnosSeleccionados).map(turnoId => {
                  const turno = turnos.find(t => t.id === turnoId);
                  if (!turno) return null;
                  return (
                    <TouchableOpacity
                      key={turnoId}
                      style={[
                        styles.turnoOption,
                        turnoSeleccionadoUsuario?.id === turnoId && styles.turnoOptionSelected
                      ]}
                      onPress={() => setTurnoSeleccionadoUsuario(turno)}
                    >
                      <Text style={[
                        styles.turnoOptionText,
                        turnoSeleccionadoUsuario?.id === turnoId && styles.turnoOptionTextSelected
                      ]}>
                        {turno.nombre}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.noTurnosText}>Primero selecciona turnos en la pestaña "Horarios"</Text>
              )}
            </View>
            
            <Text style={styles.modalSubtitle}>Seleccionar usuario</Text>
            <FlatList
              data={usuariosDisponibles.filter(u => 
                (u.nombre?.toLowerCase().includes(searchUsuario.toLowerCase()) ||
                u.cedula?.includes(searchUsuario)) &&
                !usuariosAsignados.some(asignado => 
                  asignado.id === u.id && asignado.turno_id === turnoSeleccionadoUsuario?.id
                )
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
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.modalItem,
                    origenSeleccionado?.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => setOrigenSeleccionado(item)}
                >
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 150 }}
            />
            
            <Text style={styles.modalSubtitle}>Parada de destino</Text>
            <FlatList
              data={paradas.filter(p => p.id !== origenSeleccionado?.id)}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.modalItem,
                    destinoSeleccionado?.id === item.id && styles.modalItemSelected
                  ]}
                  onPress={() => setDestinoSeleccionado(item)}
                >
                  <Text style={styles.modalItemText}>{item.nombre}</Text>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 150 }}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setModalUsuariosVisible(false);
                  setTurnoSeleccionadoUsuario(null);
                  setUsuarioSeleccionado(null);
                  setOrigenSeleccionado(null);
                  setDestinoSeleccionado(null);
                  setEditandoUsuarioIndex(null);
                }}
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