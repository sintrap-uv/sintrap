<<<<<<< HEAD
/**
 * vehiculos.jsx
 * Pantalla: Gestión de vehículos
 */

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  Switch, ActivityIndicator, StyleSheet, ScrollView,
  RefreshControl, TextInput, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
<<<<<<< HEAD
import { getCurrentUser } from "../../services/auth";
import Header from "../../components/Header";
=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
import theme from "../../constants/theme";
import {
  verificarDependenciasVehiculo,
  buscarVehiculosReemplazo,
  reasignarVehiculoEnHorarios,
  notificarCambioVehiculo,
  desactivarRutaCompleta,
  desactivarVehiculo,
  obtenerVehiculoCompleto
} from "../../services/vehicleService";

const T = theme.lightMode;

export default function VehiculosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  const vieneDelPerfil = returnTo === "perfil";
  
  const [vehiculos, setVehiculos] = useState([]);
  const [conductores, setConductores] = useState([]);
  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [busqueda, setBusqueda] = useState("");

  // Modal edición
  const [modalVisible, setModalVisible] = useState(false);
  const [editando, setEditando] = useState(null);
  const [formActivo, setFormActivo] = useState(true);
  const [formSeguro, setFormSeguro] = useState(false);
  const [formConductorId, setFormConductorId] = useState(null);
  const [formTipoVehiculoId, setFormTipoVehiculoId] = useState(null);
  const [formFechaInicio, setFormFechaInicio] = useState("");
  const [formFechaVencimiento, setFormFechaVencimiento] = useState("");
  const [showPickerInicio, setShowPickerInicio] = useState(false);
  const [showPickerVencimiento, setShowPickerVencimiento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [vehiculoDesactivando, setVehiculoDesactivando] = useState(null);

  // Modal conductor
  const [modalConductorVisible, setModalConductorVisible] = useState(false);

  // Modal tipo vehículo
  const [modalTipoVisible, setModalTipoVisible] = useState(false);

  // Modal confirmación desactivación con dependencias
  const [modalDesactivarVisible, setModalDesactivarVisible] = useState(false);
  const [dependenciasVehiculo, setDependenciasVehiculo] = useState(null);
  const [vehiculosReemplazo, setVehiculosReemplazo] = useState([]);
  const [vehiculoSeleccionadoReemplazo, setVehiculoSeleccionadoReemplazo] = useState(null);
  const [procesandoDesactivacion, setProcesandoDesactivacion] = useState(false);

<<<<<<< HEAD
  // Función para ir al perfil (cuando se presiona el engranaje)
  const handleGoToProfile = () => {
    router.push("/home?tab=perfil");
  };

  // ── FETCH VEHÍCULOS ──────────────────────────────────────────────────────
=======
  // ── FETCH VEHÍCULOS 
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  const fetchVehiculos = useCallback(async () => {
    setGlobalError(null);
    try {
      const { data, error } = await supabase
        .from("vehiculos")
        .select(`
          id, placa, seguro, activo,
          conductor_id, tipo_vehiculo_id,
          fecha_inicio, fecha_vencimiento,
          profiles ( id, nombre ),
          tipo_vehiculo ( id, nombre, capacidad_max )
        `)
        .order("placa", { ascending: true });

      if (error) throw error;
      setVehiculos(data || []);
    } catch (err) {
      setGlobalError(`Error al cargar vehículos: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchConductoresDisponibles = useCallback(async (vehiculoActualId) => {
    try {
      const { data: todos, error: e1 } = await supabase
        .from("profiles")
        .select("id, nombre")
        .eq("rol", "conductor")
        .order("nombre", { ascending: true });
      if (e1) throw e1;

      const { data: ocupados, error: e2 } = await supabase
        .from("vehiculos")
        .select("conductor_id")
        .eq("activo", true)
        .not("conductor_id", "is", null)
        .neq("id", vehiculoActualId);

      if (e2) throw e2;

      const idsOcupados = ocupados.map((v) => v.conductor_id);
      const libres = todos.filter((c) => !idsOcupados.includes(c.id));
      setConductores(libres);
    } catch (err) {
      console.warn("Error cargando conductores:", err.message);
    }
  }, []);

  const fetchConductores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre")
        .eq("rol", "conductor")
        .order("nombre", { ascending: true });
      if (error) throw error;
      setConductores(data || []);
    } catch (err) {
      console.warn("No se pudieron cargar conductores:", err.message);
    }
  }, []);

  const fetchTiposVehiculo = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("tipo_vehiculo")
        .select("id, nombre, descripcion, capacidad_max")
        .order("nombre", { ascending: true });
      if (error) throw error;
      setTiposVehiculo(data || []);
    } catch (err) {
      console.warn("No se pudieron cargar tipos:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchVehiculos();
    fetchConductores();
    fetchTiposVehiculo();
  }, [fetchVehiculos, fetchConductores, fetchTiposVehiculo]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehiculos();
  };

  const vehiculosFiltrados = vehiculos.filter((v) =>
    v.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.profiles?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

<<<<<<< HEAD
=======
  // ── ABRIR EDICIÓN 
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  function abrirEdicion(v) {
    setEditando(v);
    setFormActivo(v.activo ?? true);
    setFormSeguro(v.seguro ?? false);
    setFormConductorId(v.conductor_id ?? null);
    setFormTipoVehiculoId(v.tipo_vehiculo_id ?? null);
    setFormFechaInicio(v.fecha_inicio ?? "");
    setFormFechaVencimiento(v.fecha_vencimiento ?? "");

    fetchConductoresDisponibles(v.id);
    setModalVisible(true);
  }

  function cerrarEdicion() {
    setModalVisible(false);
    setEditando(null);
  }

<<<<<<< HEAD
=======
  // ── PICKERS DE FECHA 
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  const onChangeInicio = (event, selectedDate) => {
    setShowPickerInicio(false);
    if (selectedDate) {
      setFormFechaInicio(selectedDate.toISOString().split("T")[0]);
    }
  };

  const onChangeVencimiento = (event, selectedDate) => {
    setShowPickerVencimiento(false);
    if (selectedDate) {
      setFormFechaVencimiento(selectedDate.toISOString().split("T")[0]);
    }
  };

<<<<<<< HEAD
=======
  // ── VALIDACIÓN ANTES DE DESACTIVAR 
  async function validarDesactivacion(vehiculo) {
  try {
    setProcesandoDesactivacion(true);
    
    // GUARDAR REFERENCIA DEL VEHÍCULO COMPLETO
    setVehiculoDesactivando(vehiculo);
    
    const dependencias = await verificarDependenciasVehiculo(vehiculo.id);
    
    if (!dependencias.tiene_dependencias) {
      await desactivarVehiculo(vehiculo.id);
      Alert.alert("Éxito", `Vehículo ${vehiculo.placa} desactivado correctamente.`);
      await fetchVehiculos();
      return;
    }

    setDependenciasVehiculo(dependencias);
    
    const primerHorario = dependencias.rutas[0];
    const diasSemana = primerHorario.dias;
    const capacidadRequerida = vehiculo.tipo_vehiculo?.capacidad_max || 20;

    const reemplazos = await buscarVehiculosReemplazo(
      primerHorario.hora_inicio,
      primerHorario.hora_fin,
      capacidadRequerida,
      diasSemana
    );

    setVehiculosReemplazo(reemplazos);
    setModalDesactivarVisible(true);
    
  } catch (error) {
    Alert.alert("Error", `No se pudo validar la desactivación: ${error.message}`);
  } finally {
    setProcesandoDesactivacion(false);
  }
}

  // ── CONFIRMAR DESACTIVACIÓN CON REEMPLAZO 
  async function confirmarDesactivacionConReemplazo() {
  if (!vehiculoSeleccionadoReemplazo) {
    Alert.alert("Atención", "Selecciona un vehículo de reemplazo.");
    return;
  }

  try {
    setProcesandoDesactivacion(true);

    const horarioIds = dependenciasVehiculo.rutas.map(r => r.horario_id);

    const resultadoReasignacion = await reasignarVehiculoEnHorarios(
      horarioIds,
      vehiculoSeleccionadoReemplazo.vehiculo_id
    );

    if (!resultadoReasignacion.success) {
      throw new Error(resultadoReasignacion.error);
    }

    await notificarCambioVehiculo(
      resultadoReasignacion.rutas_afectadas,
      vehiculoDesactivando.placa,
      vehiculoSeleccionadoReemplazo.placa,
      'cambio_vehiculo'
    );

    await desactivarVehiculo(vehiculoDesactivando.id);

    Alert.alert(
      "Éxito",
      `Vehículo ${vehiculoDesactivando.placa} desactivado. Reemplazado por ${vehiculoSeleccionadoReemplazo.placa}.\n\n${dependenciasVehiculo.usuarios_afectados} usuarios notificados.`
    );

    setModalDesactivarVisible(false);
    setVehiculoDesactivando(null);  // LIMPIAR REFERENCIA
    setVehiculoSeleccionadoReemplazo(null);
    cerrarEdicion();
    await fetchVehiculos();

  } catch (error) {
    Alert.alert("Error", `No se pudo completar el reemplazo: ${error.message}`);
  } finally {
    setProcesandoDesactivacion(false);
  }
}
  
  // ── DESACTIVAR RUTA COMPLETA (sin reemplazo disponible) ──────────────────
  async function confirmarDesactivacionSinReemplazo() {
  Alert.alert(
    "Confirmar desactivación de ruta",
    `No hay vehículos disponibles para reemplazo.\n\nSe desactivarán ${dependenciasVehiculo.rutas.length} ruta(s) y se notificará a ${dependenciasVehiculo.usuarios_afectados} usuario(s).\n\n¿Deseas continuar?`,
    [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Desactivar ruta",
        style: "destructive",
        onPress: async () => {
          try {
            setProcesandoDesactivacion(true);

            for (const ruta of dependenciasVehiculo.rutas) {
              await desactivarRutaCompleta(
                ruta.ruta_id,
                `Vehículo ${vehiculoDesactivando.placa} fuera de servicio sin reemplazo disponible`,
                vehiculoDesactivando.placa  // USAR vehiculoDesactivando
              );
            }

            await desactivarVehiculo(vehiculoDesactivando.id);  // USAR vehiculoDesactivando

            Alert.alert(
              "Ruta desactivada",
              `Vehículo ${vehiculoDesactivando.placa} desactivado.\n\nRutas desactivadas: ${dependenciasVehiculo.rutas.length}\nUsuarios notificados: ${dependenciasVehiculo.usuarios_afectados}`
            );

            setModalDesactivarVisible(false);
            setVehiculoDesactivando(null);  // LIMPIAR REFERENCIA
            cerrarEdicion();
            await fetchVehiculos();

          } catch (error) {
            Alert.alert("Error", `No se pudo desactivar la ruta: ${error.message}`);
          } finally {
            setProcesandoDesactivacion(false);
          }
        }
      }
    ]
  );
}
  
  // ── UPDATE ───────────────────────────────────────────────────────────────
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  async function handleGuardar() {
    if (!editando) return;
    
    // Si está intentando desactivar el vehículo
    if (editando.activo === true && formActivo === false) {
      // Cerrar modal de edición y abrir flujo de desactivación
      cerrarEdicion();
      await validarDesactivacion(editando);
      return;
    }

    setGuardando(true);

<<<<<<< HEAD
    const conductorSeleccionado = conductores.find((c) => c.id === formConductorId) ?? null;
    const tipoSeleccionado = tiposVehiculo.find((t) => t.id === formTipoVehiculoId) ?? null;

    const prev = vehiculos;
    setVehiculos((list) =>
      list.map((v) =>
        v.id === editando.id
          ? {
              ...v,
              activo: formActivo,
              seguro: formSeguro,
              conductor_id: formConductorId,
              tipo_vehiculo_id: formTipoVehiculoId,
              fecha_inicio: formSeguro ? formFechaInicio : null,
              fecha_vencimiento: formSeguro ? formFechaVencimiento : null,
              profiles: conductorSeleccionado,
              tipo_vehiculo: tipoSeleccionado,
            }
          : v
      )
    );
    cerrarEdicion();

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
    try {
      const { error } = await supabase
        .from("vehiculos")
        .update({
          activo: formActivo,
          seguro: formSeguro,
          conductor_id: formConductorId,
          tipo_vehiculo_id: formTipoVehiculoId,
          fecha_inicio: formSeguro ? formFechaInicio : null,
          fecha_vencimiento: formSeguro ? formFechaVencimiento : null,
        })
        .eq("id", editando.id);

      if (error) throw error;

      Alert.alert("Éxito", "Vehículo actualizado correctamente.");
      cerrarEdicion();
      await fetchVehiculos();

    } catch (err) {
      Alert.alert("Error", err.message);
    } finally {
      setGuardando(false);
    }
  }

<<<<<<< HEAD
  async function pedirConfirmacion(v) {
    setParaEliminar(v);

    try {
      const { data: rutasAsignadas, error } = await supabase
        .from("ruta_horarios")
        .select("id, ruta_id, rutas(numero_ruta, nombre)")
        .eq("vehiculo_id", v.id)
        .eq("activo", true)
        .limit(1);

      if (error) throw error;

      if (rutasAsignadas?.length > 0) {
        setTieneDependencias("bloqueado");
        setInfoDependencia({
          ruta: `Ruta ${rutasAsignadas[0].rutas?.numero_ruta} - ${rutasAsignadas[0].rutas?.nombre}`
        });
      } else {
        setTieneDependencias("ninguna");
        setInfoDependencia(null);
      }
    } catch (err) {
      setTieneDependencias("ninguna");
      setInfoDependencia(null);
    }

    setConfirmVisible(true);
  }

  async function handleEliminar() {
    if (!paraEliminar) return;
    if (tieneDependencias === "bloqueado") {
      setConfirmVisible(false);
      return;
    }

    setEliminando(true);
    const prev = vehiculos;
    setVehiculos((list) => list.filter((v) => v.id !== paraEliminar.id));
    setConfirmVisible(false);

    try {
      if (tieneDependencias === "historial") {
        const { error } = await supabase
          .from("vehiculos")
          .update({ activo: false })
          .eq("id", paraEliminar.id);
        if (error) throw error;
        setVehiculos((list) =>
          list.map((v) =>
            v.id === paraEliminar.id ? { ...v, activo: false } : v
          )
        );
      } else {
        const { error } = await supabase
          .from("vehiculos")
          .delete()
          .eq("id", paraEliminar.id);
        if (error) throw error;
      }
    } catch (err) {
      setGlobalError(`Error: ${err.message}`);
      setVehiculos(prev);
    } finally {
      setEliminando(false);
      setParaEliminar(null);
    }
  }

  function renderVehiculo({ item: v }) {
    const nombreConductor = v.profiles?.nombre ?? "Sin conductor";
    const tipoNombre = v.tipo_vehiculo?.nombre ?? "Sin tipo";
=======
  // ── RENDER ───────────────────────────────────────────────────────────────
  if (loading) {
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.icon.active} />
        <Text style={s.loadingText}>Cargando vehículos...</Text>
      </View>
    );
  }

<<<<<<< HEAD
  const conductorNombreSeleccionado = formConductorId
    ? (conductores.find((c) => c.id === formConductorId)?.nombre ?? "Conductor")
    : "Sin conductor asignado";

  const tipoNombreSeleccionado = formTipoVehiculoId
    ? (tiposVehiculo.find((t) => t.id === formTipoVehiculoId)?.nombre ?? "Tipo")
    : "Seleccionar tipo";

  return (
    <View style={s.container}>
      <Header
        titulo="Vehículos"
        subtitulo="Gestión de flota vehicular"
        iconoDerecha={
          <TouchableOpacity onPress={handleGoToProfile}>
            <Ionicons name="settings-outline" size={36} color="#fff" />
          </TouchableOpacity>
        }
      />

=======
  return (
    <View style={s.container}>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
      {/* Buscador */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={T.icon.secondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por placa o conductor"
          placeholderTextColor={T.input.placeholder}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Error global */}
      {globalError && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={T.icon.error} />
          <Text style={s.errorText}>{globalError}</Text>
        </View>
      )}

      {/* Lista */}
      <FlatList
        data={vehiculosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => abrirEdicion(item)}>
            <View style={s.cardHeader}>
              <Text style={s.placa}>{item.placa}</Text>
              <View style={[s.badge, item.activo ? s.badgeActivo : s.badgeInactivo]}>
                <Text style={[s.badgeText, { color: item.activo ? "#16A34A" : T.text.tertiary }]}>
                  {item.activo ? "ACTIVO" : "INACTIVO"}
                </Text>
              </View>
            </View>

<<<<<<< HEAD
      {/* Modal — Editar Vehículo (resto igual, sin cambios) */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={cerrarEdicion}>
=======
            <View style={s.cardInfo}>
              <View style={s.infoRow}>
                <Ionicons name="person-outline" size={16} color={T.icon.secondary} />
                <Text style={s.infoValue}>
                  {item.profiles?.nombre || "Sin conductor"}
                </Text>
              </View>

              <View style={s.infoRow}>
                <Ionicons name="bus-outline" size={16} color={T.icon.secondary} />
                <Text style={s.infoValue}>
                  {item.tipo_vehiculo?.nombre || "Sin tipo"}
                </Text>
              </View>

              <View style={s.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={16} color={T.icon.secondary} />
                <Text style={s.infoValue}>
                  SOAT: {item.seguro ? (item.fecha_vencimiento || "Sin fecha") : "Sin seguro"}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.centered}>
            <Ionicons name="bus-outline" size={48} color={T.icon.tertiary} />
            <Text style={s.loadingText}>No hay vehículos registrados</Text>
          </View>
        }
      />

      {/* MODAL EDICIÓN */}
      <Modal visible={modalVisible} animationType="slide" transparent>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Editar vehículo</Text>
              <TouchableOpacity onPress={cerrarEdicion}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>
<<<<<<< HEAD
            <ScrollView style={s.modalBody}>
              <Text style={s.fieldLabel}>Estado</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 }}>
                <Text>Activo</Text>
                <Switch value={formActivo} onValueChange={setFormActivo} />
              </View>

              <Text style={s.fieldLabel}>Seguro vigente</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 }}>
                <Text>SOAT activo</Text>
=======

            <ScrollView style={s.modalBody}>
              <Text style={s.fieldLabel}>Placa</Text>
              <View style={s.inputRow}>
                <Text style={s.inputText}>{editando?.placa}</Text>
              </View>

              <Text style={s.fieldLabel}>Estado del vehículo</Text>
              <View style={[s.inputRow, { justifyContent: "space-between" }]}>
                <Text style={s.inputText}>{formActivo ? "Activo" : "Inactivo"}</Text>
                <Switch value={formActivo} onValueChange={setFormActivo} />
              </View>

              <Text style={s.fieldLabel}>Tiene SOAT vigente</Text>
              <View style={[s.inputRow, { justifyContent: "space-between" }]}>
                <Text style={s.inputText}>{formSeguro ? "Sí" : "No"}</Text>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
                <Switch value={formSeguro} onValueChange={setFormSeguro} />
              </View>

              {formSeguro && (
                <>
<<<<<<< HEAD
                  <Text style={s.fieldLabel}>Fecha inicio SOAT</Text>
                  <TouchableOpacity style={s.inputRow} onPress={() => setShowPickerInicio(true)}>
                    <Ionicons name="calendar-outline" size={20} color={T.text.secondary} style={s.inputIcon} />
                    <Text style={s.inputText}>{formFechaInicio || "Seleccionar fecha"}</Text>
                  </TouchableOpacity>

                  {showPickerInicio && (
                    <DateTimePicker
                      value={formFechaInicio ? new Date(formFechaInicio) : new Date()}
                      mode="date"
                      display="default"
                      onChange={onChangeInicio}
                    />
                  )}

                  <Text style={s.fieldLabel}>Fecha vencimiento SOAT</Text>
                  <TouchableOpacity style={s.inputRow} onPress={() => setShowPickerVencimiento(true)}>
                    <Ionicons name="calendar-outline" size={20} color={T.text.secondary} style={s.inputIcon} />
                    <Text style={s.inputText}>{formFechaVencimiento || "Seleccionar fecha"}</Text>
=======
                  <Text style={s.fieldLabel}>Fecha vencimiento SOAT</Text>
                  <TouchableOpacity style={s.inputRow} onPress={() => setShowPickerVencimiento(true)}>
                    <Ionicons name="calendar-outline" size={20} color={T.icon.secondary} style={s.inputIcon} />
                    <Text style={s.inputText}>
                      {formFechaVencimiento || "Seleccionar fecha"}
                    </Text>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
                  </TouchableOpacity>

                  {showPickerVencimiento && (
                    <DateTimePicker
                      value={formFechaVencimiento ? new Date(formFechaVencimiento) : new Date()}
                      mode="date"
                      display="default"
                      onChange={onChangeVencimiento}
                    />
                  )}
                </>
              )}

<<<<<<< HEAD
              <Text style={s.fieldLabel}>Tipo de vehículo</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalTipoVisible(true)}>
                <Ionicons name="car-outline" size={20} color={T.text.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>{tipoNombreSeleccionado}</Text>
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Conductor asignado</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalConductorVisible(true)}>
                <Ionicons name="person-outline" size={20} color={T.text.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>{conductorNombreSeleccionado}</Text>
=======
              <Text style={s.fieldLabel}>Conductor</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalConductorVisible(true)}>
                <Ionicons name="person-outline" size={20} color={T.icon.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>
                  {conductores.find(c => c.id === formConductorId)?.nombre || "Seleccionar conductor"}
                </Text>
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Tipo de vehículo</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalTipoVisible(true)}>
                <Ionicons name="bus-outline" size={20} color={T.icon.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>
                  {tiposVehiculo.find(t => t.id === formTipoVehiculoId)?.nombre || "Seleccionar tipo"}
                </Text>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
              </TouchableOpacity>
            </ScrollView>

            <View style={s.modalFoot}>
              <TouchableOpacity style={s.btnCancel} onPress={cerrarEdicion}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleGuardar} disabled={guardando}>
<<<<<<< HEAD
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveText}>Guardar</Text>}
=======
                {guardando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.btnSaveText}>Guardar</Text>
                )}
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

<<<<<<< HEAD
      {/* Modal seleccionar conductor */}
      <Modal visible={modalConductorVisible} transparent animationType="slide" onRequestClose={() => setModalConductorVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar conductor</Text>
              <TouchableOpacity onPress={() => setModalConductorVisible(false)}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
              </TouchableOpacity>
            </View>
=======
      {/* MODAL DESACTIVAR CON DEPENDENCIAS */}
      <Modal visible={modalDesactivarVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Desactivar vehículo con rutas asignadas</Text>
              <TouchableOpacity onPress={() => setModalDesactivarVisible(false)}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody}>
              <View style={s.confirmBody}>
                <View style={[s.confirmIconCircle, { backgroundColor: "#FEF2F2" }]}>
                  <Ionicons name="warning-outline" size={36} color={T.icon.error} />
                </View>

                <Text style={s.confirmTitle}>Vehículo con rutas activas</Text>
                <Text style={s.confirmSubtext}>
                  El vehículo <Text style={{ fontWeight: "700" }}>{vehiculoDesactivando?.placa}</Text> tiene{" "}
                  {dependenciasVehiculo?.horarios_activos} horario(s) activo(s) que afectan a{" "}
                  {dependenciasVehiculo?.usuarios_afectados} usuario(s).
                </Text>

                {vehiculosReemplazo.length > 0 ? (
                  <>
                    <Text style={[s.fieldLabel, { marginTop: 16 }]}>
                      Selecciona un vehículo de reemplazo:
                    </Text>
                    {vehiculosReemplazo.map((v) => (
                      <TouchableOpacity
                        key={v.vehiculo_id}
                        style={[
                          s.modalItem,
                          vehiculoSeleccionadoReemplazo?.vehiculo_id === v.vehiculo_id && s.modalItemSelected
                        ]}
                        onPress={() => setVehiculoSeleccionadoReemplazo(v)}
                      >
                        <Ionicons
                          name={vehiculoSeleccionadoReemplazo?.vehiculo_id === v.vehiculo_id ? "radio-button-on" : "radio-button-off"}
                          size={22}
                          color={vehiculoSeleccionadoReemplazo?.vehiculo_id === v.vehiculo_id ? T.icon.active : T.icon.secondary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={s.modalItemText}>
                            {v.placa} - {v.tipo_vehiculo} ({v.capacidad_max} pasajeros)
                          </Text>
                          <Text style={s.fieldHint}>
                            {v.conductor_nombre || "Sin conductor"} • SOAT vigente hasta {v.fecha_vencimiento_soat}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </>
                ) : (
                  <View style={s.confirmCard}>
                    <Text style={s.confirmSubtext}>
                      No hay vehículos disponibles para reemplazo en este horario.
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={s.modalFoot}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setModalDesactivarVisible(false)}
                disabled={procesandoDesactivacion}
              >
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>

              {vehiculosReemplazo.length > 0 ? (
                <TouchableOpacity
                  style={s.btnSave}
                  onPress={confirmarDesactivacionConReemplazo}
                  disabled={procesandoDesactivacion || !vehiculoSeleccionadoReemplazo}
                >
                  {procesandoDesactivacion ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.btnSaveText}>Reasignar y desactivar</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.btnSave, { backgroundColor: T.icon.error }]}
                  onPress={confirmarDesactivacionSinReemplazo}
                  disabled={procesandoDesactivacion}
                >
                  {procesandoDesactivacion ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={s.btnSaveText}>Desactivar ruta</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL SELECCIONAR CONDUCTOR */}
      <Modal visible={modalConductorVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar conductor</Text>
              <TouchableOpacity onPress={() => setModalConductorVisible(false)}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
            <ScrollView>
              {conductores.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.modalItem, formConductorId === c.id && s.modalItemSelected]}
                  onPress={() => {
                    setFormConductorId(c.id);
                    setModalConductorVisible(false);
                  }}
                >
<<<<<<< HEAD
                  <Ionicons name="person-outline" size={20} color={T.text.secondary} />
                  <Text style={s.modalItemText}>{c.nombre}</Text>
                  {formConductorId === c.id && <Ionicons name="checkmark" size={20} color="#22C55E" />}
=======
                  <Ionicons
                    name={formConductorId === c.id ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={formConductorId === c.id ? T.icon.active : T.icon.secondary}
                  />
                  <Text style={s.modalItemText}>{c.nombre}</Text>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

<<<<<<< HEAD
      {/* Modal seleccionar tipo vehículo */}
      <Modal visible={modalTipoVisible} transparent animationType="slide" onRequestClose={() => setModalTipoVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar tipo</Text>
=======
      {/* MODAL SELECCIONAR TIPO */}
      <Modal visible={modalTipoVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar tipo de vehículo</Text>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
              <TouchableOpacity onPress={() => setModalTipoVisible(false)}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {tiposVehiculo.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.modalItem, formTipoVehiculoId === t.id && s.modalItemSelected]}
                  onPress={() => {
                    setFormTipoVehiculoId(t.id);
                    setModalTipoVisible(false);
                  }}
                >
<<<<<<< HEAD
                  <Ionicons name="bus-outline" size={20} color={T.text.secondary} />
                  <Text style={s.modalItemText}>{t.nombre}</Text>
                  {formTipoVehiculoId === t.id && <Ionicons name="checkmark" size={20} color="#22C55E" />}
=======
                  <Ionicons
                    name={formTipoVehiculoId === t.id ? "radio-button-on" : "radio-button-off"}
                    size={22}
                    color={formTipoVehiculoId === t.id ? T.icon.active : T.icon.secondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalItemText}>{t.nombre}</Text>
                    {t.descripcion && <Text style={s.fieldHint}>{t.descripcion}</Text>}
                  </View>
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
<<<<<<< HEAD

      {/* Modal confirmación borrado */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { maxHeight: "70%", margin: 20, borderRadius: 24 }]}>
            <View style={s.confirmBody}>
              <View style={[s.confirmIconCircle, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="trash-outline" size={36} color="#EF4444" />
              </View>
              <Text style={s.confirmTitle}>Eliminar vehículo</Text>
              <Text style={s.confirmSubtext}>
                ¿Estás seguro de eliminar este vehículo? Esta acción no se puede deshacer.
              </Text>

              {tieneDependencias === "bloqueado" && infoDependencia && (
                <View style={s.confirmCard}>
                  <Text style={[s.confirmRowLabel, { textAlign: "center", marginTop: 8 }]}>
                    No se puede eliminar este vehículo porque está asignado a:
                  </Text>
                  <View style={s.confirmRow}>
                    <Text style={s.confirmRowLabel}>📋 {infoDependencia.ruta}</Text>
                  </View>
                  <Text style={[s.confirmRowLabel, { textAlign: "center", marginBottom: 8 }]}>
                    Desasigna la ruta antes de continuar.
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 12, marginTop: 16, width: "100%" }}>
                <TouchableOpacity style={[s.btnCancel, { flex: 1 }]} onPress={() => setConfirmVisible(false)}>
                  <Text style={s.btnCancelText}>Cancelar</Text>
                </TouchableOpacity>
                {tieneDependencias !== "bloqueado" && (
                  <TouchableOpacity
                    style={[s.btnSave, { flex: 1, backgroundColor: "#EF4444" }]}
                    onPress={handleEliminar}
                    disabled={eliminando}
                  >
                    {eliminando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveText}>Eliminar</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
    </View>
  );
}

// Estilos
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
<<<<<<< HEAD

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.input.background,
    borderWidth: 1, borderColor: T.input.border,
    borderRadius: T.input.borderRadius,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
<<<<<<< HEAD
  searchInput: { flex: 1, fontSize: 14, color: T.input.text },

=======
  searchInput: { flex: 1, fontSize: 14, color: T.input.text, marginLeft: 8 },
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12, gap: 8,
  },
  errorText: { color: T.icon.error, fontSize: 13, flex: 1 },
<<<<<<< HEAD

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: T.text.secondary, fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12, paddingTop: 8 },

=======
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: T.text.secondary, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12, paddingTop: 8 },
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  card: {
    backgroundColor: T.cards.background,
    borderRadius: T.cards.borderRadius,
    borderWidth: 1, borderColor: T.cards.border,
    padding: 16, gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  placa: { fontSize: 20, fontWeight: "800", color: T.text.primary, letterSpacing: 1 },
  badge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeActivo: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeInactivo: { backgroundColor: "#F1F5F9", borderColor: T.cards.border },
  badgeText: { fontSize: 11, fontWeight: "600" },
  cardInfo: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoValue: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },
<<<<<<< HEAD

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: T.cards.border,
    maxHeight: "92%", paddingBottom: 24,
  },
  modalHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: T.text.primary },
  modalBody: { padding: 20 },
  modalFoot: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: T.cards.border,
  },
<<<<<<< HEAD

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  fieldLabel: { fontSize: 13, fontWeight: "600", color: T.text.secondary, marginBottom: 6, marginTop: 14 },
  fieldHint: { fontSize: 11, color: T.text.tertiary, marginTop: 3 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4,
  },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 15, color: T.text.primary },
<<<<<<< HEAD

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  modalItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalItemSelected: { backgroundColor: "#F0FDF4" },
  modalItemText: { flex: 1, fontSize: 15, color: T.text.primary },
<<<<<<< HEAD

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  btnCancel: {
    flex: 1, borderWidth: 1, borderColor: T.cards.border,
    borderRadius: T.Button.secondary.borderRadius,
    paddingVertical: 13, alignItems: "center",
    backgroundColor: T.Button.secondary.background,
  },
  btnCancelText: { color: T.text.secondary, fontWeight: "700", fontSize: 14 },
  btnSave: {
    flex: 1, backgroundColor: T.Button.primary.background,
    borderRadius: T.Button.primary.borderRadius,
    paddingVertical: 13, alignItems: "center",
  },
  btnSaveText: { color: "#fff", fontWeight: "800", fontSize: 14 },
<<<<<<< HEAD

=======
>>>>>>> e75f8cdf54b5bbeb49a28a21f0e063034484be63
  confirmBody: { alignItems: "center", padding: 20, gap: 12 },
  confirmIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 16, fontWeight: "800", textAlign: "center", color: T.text.primary },
  confirmSubtext: { fontSize: 13, color: T.text.secondary, textAlign: "center", lineHeight: 20 },
  confirmCard: {
    width: "100%", backgroundColor: "#F8FAFC",
    borderRadius: 12, borderWidth: 1, borderColor: T.cards.border,
    padding: 16,
  },
});
