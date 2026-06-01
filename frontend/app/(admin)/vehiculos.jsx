import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  Switch, ActivityIndicator, StyleSheet, ScrollView,
  RefreshControl, TextInput,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import Header from "../../components/Header";
import theme from "../../constants/theme";
import { useToast } from "../../context/ToastContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  verificarDependenciasVehiculo,
  buscarVehiculosReemplazo,
  reasignarVehiculoEnHorarios,
  notificarCambioVehiculo,
  desactivarRutaCompleta,
  desactivarVehiculo,
  Alert,
  obtenerVehiculoCompleto,
} from "../../services/vehicleService";

const T = theme.lightMode;

// ── UTILIDAD: ESTADO DE SEGURO 
function calcularEstadoSeguro(fechaVencimiento, tieneSeguro) {
  if (!tieneSeguro) {
    return { estado: "sin_seguro", color: "#EF4444", bg: "#FEE2E2", label: "Sin póliza", icono: "alert-circle" };
  }
  if (!fechaVencimiento) {
    return { estado: "sin_fecha", color: "#9CA3AF", bg: "#F3F4F6", label: "Sin fecha", icono: "help-circle-outline" };
  }
  const hoy = new Date();
  const fecha = new Date(fechaVencimiento);
  const dias = Math.floor((fecha - hoy) / (1000 * 60 * 60 * 24));

  if (dias < 0)   return { estado: "vencido",  color: "#EF4444", bg: "#FEE2E2", label: "Vencido",           icono: "alert-octagon",   dias };
  if (dias <= 7)  return { estado: "critico",  color: "#F97316", bg: "#FFEDD5", label: `Vence en ${dias}d`, icono: "alert",           dias };
  if (dias <= 30) return { estado: "proximo",  color: "#FBBF24", bg: "#FEF3C7", label: `Vence en ${dias}d`, icono: "clock-outline",   dias };
  return           { estado: "vigente",  color: "#10B981", bg: "#DCFCE7", label: "Vigente",           icono: "check-circle",    dias };
}

export default function VehiculosScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  const vieneDelPerfil = returnTo === "perfil";
  const { showSuccess, showError, showWarning } = useToast();

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

  // Modales secundarios
  const [modalConductorVisible, setModalConductorVisible] = useState(false);
  const [modalTipoVisible, setModalTipoVisible] = useState(false);

  // Modal desactivación
  const [modalDesactivarVisible, setModalDesactivarVisible] = useState(false);
  const [dependenciasVehiculo, setDependenciasVehiculo] = useState(null);
  const [vehiculosReemplazo, setVehiculosReemplazo] = useState([]);
  const [vehiculoSeleccionadoReemplazo, setVehiculoSeleccionadoReemplazo] = useState(null);
  const [procesandoDesactivacion, setProcesandoDesactivacion] = useState(false);

  const handleGoToProfile = () => {
    router.push("/home?tab=perfil");
  };

  // ── FETCH 
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

  // ── EDICIÓN 
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

  const onChangeInicio = (event, selectedDate) => {
    setShowPickerInicio(false);
    if (selectedDate) {
      const fechaStr = selectedDate.toISOString().split("T")[0];
      setFormFechaInicio(fechaStr);
      // Auto-calcular vencimiento +1 año
      const venc = new Date(selectedDate);
      venc.setFullYear(venc.getFullYear() + 1);
      setFormFechaVencimiento(venc.toISOString().split("T")[0]);
    }
  };

  const onChangeVencimiento = (event, selectedDate) => {
    setShowPickerVencimiento(false);
    if (selectedDate) {
      setFormFechaVencimiento(selectedDate.toISOString().split("T")[0]);
    }
  };

  // ── LÓGICA DE DESACTIVACIÓN (sin cambios) 
  async function validarDesactivacion(vehiculo) {
    try {
      setProcesandoDesactivacion(true);
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
      const capacidadRequerida = vehiculo.tipo_vehiculo?.capacidad_max || 20;
      const reemplazos = await buscarVehiculosReemplazo(
        primerHorario.hora_inicio,
        primerHorario.hora_fin,
        capacidadRequerida,
        primerHorario.dias
      );
      setVehiculosReemplazo(reemplazos);
      setModalDesactivarVisible(true);
    } catch (error) {
      Alert.alert("Error", `No se pudo validar la desactivación: ${error.message}`);
    } finally {
      setProcesandoDesactivacion(false);
    }
  }

  async function confirmarDesactivacionConReemplazo() {
    if (!vehiculoSeleccionadoReemplazo) {
      Alert.alert("Atención", "Selecciona un vehículo de reemplazo.");
      return;
    }
    try {
      setProcesandoDesactivacion(true);
      const horarioIds = dependenciasVehiculo.rutas.map((r) => r.horario_id);
      const resultadoReasignacion = await reasignarVehiculoEnHorarios(horarioIds, vehiculoSeleccionadoReemplazo.vehiculo_id);
      if (!resultadoReasignacion.success) throw new Error(resultadoReasignacion.error);
      await notificarCambioVehiculo(resultadoReasignacion.rutas_afectadas, vehiculoDesactivando.placa, vehiculoSeleccionadoReemplazo.placa, "cambio_vehiculo");
      await desactivarVehiculo(vehiculoDesactivando.id);
      Alert.alert("Éxito", `Vehículo ${vehiculoDesactivando.placa} desactivado. Reemplazado por ${vehiculoSeleccionadoReemplazo.placa}.\n\n${dependenciasVehiculo.usuarios_afectados} usuarios notificados.`);
      setModalDesactivarVisible(false);
      setVehiculoDesactivando(null);
      setVehiculoSeleccionadoReemplazo(null);
      cerrarEdicion();
      await fetchVehiculos();
    } catch (error) {
      Alert.alert("Error", `No se pudo completar el reemplazo: ${error.message}`);
    } finally {
      setProcesandoDesactivacion(false);
    }
  }

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
                await desactivarRutaCompleta(ruta.ruta_id, `Vehículo ${vehiculoDesactivando.placa} fuera de servicio sin reemplazo disponible`, vehiculoDesactivando.placa);
              }
              await desactivarVehiculo(vehiculoDesactivando.id);
              showSuccess(`Vehículo ${vehiculoDesactivando.placa} desactivado.`);
              setModalDesactivarVisible(false);
              setVehiculoDesactivando(null);
              cerrarEdicion();
              await fetchVehiculos();
            } catch (error) {
              Alert.alert("Error", `No se pudo desactivar la ruta: ${error.message}`);
            } finally {
              setProcesandoDesactivacion(false);
            }
          },
        },
      ]
    );
  }

  async function handleGuardar() {
    if (!editando) return;
    if (editando.activo === true && formActivo === false) {
      cerrarEdicion();
      await validarDesactivacion(editando);
      return;
    }
    setGuardando(true);
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

  // ── RENDER
  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color={T.icon.active} />
        <Text style={s.loadingText}>Cargando vehículos...</Text>
      </View>
    );
  }

  // Estadísticas rápidas para el resumen superior
  const totalActivos   = vehiculos.filter((v) => v.activo).length;
  const totalVencidos  = vehiculos.filter((v) => calcularEstadoSeguro(v.fecha_vencimiento, v.seguro).estado === "vencido").length;
  const totalCriticos  = vehiculos.filter((v) => {
    const e = calcularEstadoSeguro(v.fecha_vencimiento, v.seguro).estado;
    return e === "critico" || e === "proximo";
  }).length;

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

      {/* BUSCADOR */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={18} color={T.icon.secondary} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar por placa o conductor"
          placeholderTextColor={T.input.placeholder}
          value={busqueda}
          onChangeText={setBusqueda}
        />
        {busqueda.length > 0 && (
          <TouchableOpacity onPress={() => setBusqueda("")}>
            <Ionicons name="close-circle" size={18} color={T.icon.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ERROR GLOBAL */}
      {globalError && (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle-outline" size={20} color={T.icon.error} />
          <Text style={s.errorText}>{globalError}</Text>
        </View>
      )}

      {/* RESUMEN RÁPIDO */}
      {vehiculos.length > 0 && (
        <View style={s.resumen}>
          <View style={s.resumenItem}>
            <Text style={s.resumenNum}>{totalActivos}</Text>
            <Text style={s.resumenLabel}>Activos</Text>
          </View>
          <View style={s.resumenDivider} />
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, totalVencidos > 0 && { color: "#EF4444" }]}>{totalVencidos}</Text>
            <Text style={s.resumenLabel}>Vencidos</Text>
          </View>
          <View style={s.resumenDivider} />
          <View style={s.resumenItem}>
            <Text style={[s.resumenNum, totalCriticos > 0 && { color: "#F97316" }]}>{totalCriticos}</Text>
            <Text style={s.resumenLabel}>Por vencer</Text>
          </View>
          <View style={s.resumenDivider} />
          <View style={s.resumenItem}>
            <Text style={s.resumenNum}>{vehiculos.length}</Text>
            <Text style={s.resumenLabel}>Total</Text>
          </View>
        </View>
      )}

      {/* LISTA */}
      <FlatList
        data={vehiculosFiltrados}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.centered}>
            <MaterialCommunityIcons name="bus-alert" size={56} color={T.icon.tertiary} />
            <Text style={s.loadingText}>No hay vehículos registrados</Text>
          </View>
        }
        renderItem={({ item }) => {
          const seg = calcularEstadoSeguro(item.fecha_vencimiento, item.seguro);
          const esCritico = seg.estado === "vencido" || seg.estado === "critico";

          return (
            <TouchableOpacity
              style={[s.card, esCritico && s.cardCritica, !item.activo && s.cardInactiva]}
              onPress={() => abrirEdicion(item)}
              activeOpacity={0.75}
            >
              {/* HEADER: PLACA + BADGE ESTADO */}
              <View style={s.cardHeader}>
                <View>
                  <Text style={s.placa}>{item.placa}</Text>
                  <Text style={s.tipoLabel}>
                    {item.tipo_vehiculo?.nombre || "Sin tipo"} • {item.tipo_vehiculo?.capacidad_max || 0} pas.
                  </Text>
                </View>
                <View style={[s.badge, item.activo ? s.badgeActivo : s.badgeInactivo]}>
                  <MaterialCommunityIcons
                    name={item.activo ? "check-circle" : "pause-circle"}
                    size={13}
                    color={item.activo ? "#15803D" : "#6B7280"}
                  />
                  <Text style={[s.badgeText, { color: item.activo ? "#15803D" : "#6B7280" }]}>
                    {item.activo ? "Activo" : "Inactivo"}
                  </Text>
                </View>
              </View>

              {/* CONDUCTOR */}
              <View style={s.infoRow}>
                <MaterialCommunityIcons name="account-circle-outline" size={16} color={T.icon.secondary} />
                <Text style={s.infoValue}>{item.profiles?.nombre || "Sin conductor asignado"}</Text>
              </View>

              {/* ESTADO SOAT */}
              <View style={[s.soatContainer, { backgroundColor: seg.bg, borderLeftColor: seg.color }]}>
                <View style={[s.soatIcono, { backgroundColor: seg.color }]}>
                  <MaterialCommunityIcons name={seg.icono} size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.soatEtiqueta}>SOAT</Text>
                  <Text style={[s.soatEstado, { color: seg.color }]}>{seg.label}</Text>
                  {item.fecha_vencimiento && (
                    <Text style={s.soatFecha}>
                      {new Date(item.fecha_vencimiento).toLocaleDateString("es-CO", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </Text>
                  )}
                </View>
                {/* Días exactos en badge si aplica */}
                {(seg.estado === "critico" || seg.estado === "proximo") && (
                  <View style={[s.diasBadge, { backgroundColor: seg.color }]}>
                    <Text style={s.diasBadgeText}>{seg.dias}d</Text>
                  </View>
                )}
                {seg.estado === "vencido" && (
                  <View style={[s.diasBadge, { backgroundColor: seg.color }]}>
                    <Text style={s.diasBadgeText}>!</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ─── MODAL EDICIÓN  */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Editar vehículo</Text>
              <TouchableOpacity onPress={cerrarEdicion}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* PLACA */}
              <Text style={s.fieldLabel}>Placa</Text>
              <View style={[s.inputRow, s.inputDisabled]}>
                <MaterialCommunityIcons name="car-info" size={18} color={T.icon.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>{editando?.placa}</Text>
              </View>

              {/* TIPO DE VEHÍCULO */}
              <Text style={s.fieldLabel}>Tipo de vehículo</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalTipoVisible(true)}>
                <MaterialCommunityIcons name="car-side" size={18} color={T.icon.secondary} style={s.inputIcon} />
                <Text style={[s.inputText, !formTipoVehiculoId && s.inputPlaceholder]}>
                  {tiposVehiculo.find((t) => t.id === formTipoVehiculoId)?.nombre || "Seleccionar tipo"}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={T.icon.secondary} />
              </TouchableOpacity>

              {/* CONDUCTOR */}
              <Text style={s.fieldLabel}>Conductor</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalConductorVisible(true)}>
                <MaterialCommunityIcons name="account" size={18} color={T.icon.secondary} style={s.inputIcon} />
                <Text style={[s.inputText, !formConductorId && s.inputPlaceholder]}>
                  {conductores.find((c) => c.id === formConductorId)?.nombre || "Seleccionar conductor"}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color={T.icon.secondary} />
              </TouchableOpacity>

              <View style={s.modalDivider} />
              <Text style={s.sectionLabel}>Estado operacional</Text>

              {/* ESTADO ACTIVO */}
              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchTitle}>Vehículo activo</Text>
                  <Text style={s.switchHint}>Disponible para rutas y turnos</Text>
                </View>
                <Switch
                  value={formActivo}
                  onValueChange={setFormActivo}
                  trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                  thumbColor={formActivo ? "#22C55E" : "#9CA3AF"}
                />
              </View>

              {/* SOAT */}
              <View style={[s.switchRow, formActivo && !formSeguro && s.switchRowError]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchTitle}>SOAT vigente</Text>
                  <Text style={s.switchHint}>Seguro obligatorio de responsabilidad civil</Text>
                </View>
                <Switch
                  value={formSeguro}
                  onValueChange={(value) => {
                    setFormSeguro(value);
                    if (value && !formFechaVencimiento) {
                      const hoy = new Date();
                      const venc = new Date(hoy);
                      venc.setFullYear(venc.getFullYear() + 1);
                      setFormFechaVencimiento(venc.toISOString().split("T")[0]);
                    }
                  }}
                  trackColor={{ false: "#FECACA", true: "#86EFAC" }}
                  thumbColor={formSeguro ? "#22C55E" : "#EF4444"}
                />
              </View>

              {/* BANNER VALIDACIÓN */}
              {formActivo && !formSeguro && (
                <View style={s.validationBanner}>
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text style={s.validationText}>
                    Un vehículo activo debe tener SOAT vigente.
                  </Text>
                </View>
              )}

              {/* FECHAS SOAT */}
              {formSeguro && (
                <>
                  <View style={s.modalDivider} />
                  <Text style={s.sectionLabel}>Datos del SOAT</Text>

                  <Text style={s.fieldLabel}>Fecha de inicio</Text>
                  <TouchableOpacity style={s.inputRow} onPress={() => setShowPickerInicio(true)}>
                    <Ionicons name="calendar-outline" size={18} color={T.icon.secondary} style={s.inputIcon} />
                    <Text style={[s.inputText, !formFechaInicio && s.inputPlaceholder]}>
                      {formFechaInicio
                        ? new Date(formFechaInicio).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
                        : "Seleccionar fecha de inicio"}
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={T.icon.secondary} />
                  </TouchableOpacity>
                  {showPickerInicio && (
                    <DateTimePicker
                      value={formFechaInicio ? new Date(formFechaInicio) : new Date()}
                      mode="date" display="spinner" onChange={onChangeInicio}
                    />
                  )}

                  <Text style={s.fieldLabel}>Fecha de vencimiento</Text>
                  <View style={[s.inputRow, s.inputAutoFill]}>
                    <Ionicons name="calendar-outline" size={18} color="#10B981" style={s.inputIcon} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.inputText}>
                        {formFechaVencimiento
                          ? new Date(formFechaVencimiento).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })
                          : "Se calcula automáticamente"}
                      </Text>
                      <Text style={s.fieldHint}>+12 meses desde fecha de inicio</Text>
                    </View>
                    <View style={s.autoBadge}>
                      <Text style={s.autoBadgeText}>Auto</Text>
                    </View>
                  </View>
                </>
              )}

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={s.modalFoot}>
              <TouchableOpacity style={s.btnCancel} onPress={cerrarEdicion} disabled={guardando}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, (formActivo && !formSeguro) && s.btnSaveDisabled]}
                onPress={handleGuardar}
                disabled={guardando || (formActivo && !formSeguro)}
              >
                {guardando ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={s.btnSaveText}>
                    {formActivo && !formSeguro ? "Activa SOAT primero" : "Guardar"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL DESACTIVAR CON DEPENDENCIAS ───────────────────────────── */}
      <Modal visible={modalDesactivarVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Desactivar vehículo</Text>
              <TouchableOpacity onPress={() => setModalDesactivarVisible(false)}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              <View style={s.confirmBody}>
                <View style={s.confirmIconCircle}>
                  <Ionicons name="warning-outline" size={36} color="#DC2626" />
                </View>
                <Text style={s.confirmTitle}>Vehículo con rutas activas</Text>
                <Text style={s.confirmSubtext}>
                  El vehículo <Text style={{ fontWeight: "700" }}>{vehiculoDesactivando?.placa}</Text> tiene{" "}
                  {dependenciasVehiculo?.horarios_activos} horario(s) activo(s) que afectan a{" "}
                  {dependenciasVehiculo?.usuarios_afectados} usuario(s).
                </Text>

                {vehiculosReemplazo.length > 0 ? (
                  <>
                    <Text style={[s.fieldLabel, { marginTop: 16, alignSelf: "flex-start" }]}>
                      Selecciona un vehículo de reemplazo:
                    </Text>
                    {vehiculosReemplazo.map((v) => (
                      <TouchableOpacity
                        key={v.vehiculo_id}
                        style={[s.modalItem, vehiculoSeleccionadoReemplazo?.vehiculo_id === v.vehiculo_id && s.modalItemSelected]}
                        onPress={() => setVehiculoSeleccionadoReemplazo(v)}
                      >
                        <Ionicons
                          name={vehiculoSeleccionadoReemplazo?.vehiculo_id === v.vehiculo_id ? "radio-button-on" : "radio-button-off"}
                          size={22}
                          color={vehiculoSeleccionadoReemplazo?.vehiculo_id === v.vehiculo_id ? T.icon.active : T.icon.secondary}
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={s.modalItemText}>{v.placa} — {v.tipo_vehiculo} ({v.capacidad_max} pas.)</Text>
                          <Text style={s.fieldHint}>{v.conductor_nombre || "Sin conductor"} • SOAT: {v.fecha_vencimiento_soat}</Text>
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
              <TouchableOpacity style={s.btnCancel} onPress={() => setModalDesactivarVisible(false)} disabled={procesandoDesactivacion}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              {vehiculosReemplazo.length > 0 ? (
                <TouchableOpacity
                  style={[s.btnSave, (!vehiculoSeleccionadoReemplazo || procesandoDesactivacion) && s.btnSaveDisabled]}
                  onPress={confirmarDesactivacionConReemplazo}
                  disabled={procesandoDesactivacion || !vehiculoSeleccionadoReemplazo}
                >
                  {procesandoDesactivacion ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnSaveText}>Reasignar y desactivar</Text>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[s.btnSave, { backgroundColor: "#EF4444" }, procesandoDesactivacion && s.btnSaveDisabled]}
                  onPress={confirmarDesactivacionSinReemplazo}
                  disabled={procesandoDesactivacion}
                >
                  {procesandoDesactivacion ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnSaveText}>Desactivar ruta</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL SELECCIONAR CONDUCTOR */}
      <Modal visible={modalConductorVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar conductor</Text>
              <TouchableOpacity onPress={() => setModalConductorVisible(false)}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {/* SIN CONDUCTOR */}
              <TouchableOpacity
                style={[s.modalItem, formConductorId === null && s.modalItemSelected]}
                onPress={() => { setFormConductorId(null); setModalConductorVisible(false); }}
              >
                <Ionicons name={formConductorId === null ? "radio-button-on" : "radio-button-off"} size={22} color={formConductorId === null ? T.icon.active : T.icon.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={s.modalItemText}>Sin conductor</Text>
                  <Text style={s.fieldHint}>Dejar vehículo sin asignar</Text>
                </View>
              </TouchableOpacity>
              <View style={s.modalSeparador} />
              {conductores.length === 0 ? (
                <View style={s.modalEmpty}>
                  <MaterialCommunityIcons name="account-off-outline" size={32} color={T.icon.tertiary} />
                  <Text style={s.modalEmptyText}>No hay conductores disponibles</Text>
                </View>
              ) : (
                conductores.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.modalItem, formConductorId === c.id && s.modalItemSelected]}
                    onPress={() => { setFormConductorId(c.id); setModalConductorVisible(false); }}
                  >
                    <Ionicons name={formConductorId === c.id ? "radio-button-on" : "radio-button-off"} size={22} color={formConductorId === c.id ? T.icon.active : T.icon.secondary} />
                    <Text style={s.modalItemText}>{c.nombre}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL SELECCIONAR TIPO VEHÍCULO */}
      <Modal visible={modalTipoVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Tipo de vehículo</Text>
              <TouchableOpacity onPress={() => setModalTipoVisible(false)}>
                <Ionicons name="close" size={24} color={T.icon.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {tiposVehiculo.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.modalItem, formTipoVehiculoId === t.id && s.modalItemSelected]}
                  onPress={() => { setFormTipoVehiculoId(t.id); setModalTipoVisible(false); }}
                >
                  <Ionicons name={formTipoVehiculoId === t.id ? "radio-button-on" : "radio-button-off"} size={22} color={formTipoVehiculoId === t.id ? T.icon.active : T.icon.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.modalItemText}>{t.nombre}</Text>
                    {t.descripcion && <Text style={s.fieldHint}>{t.descripcion}</Text>}
                    <Text style={s.fieldHint}>Capacidad: {t.capacidad_max} pasajeros</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── ESTILOS
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },

  // BÚSQUEDA
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.input.background,
    borderWidth: 1, borderColor: T.input.border,
    borderRadius: T.input.borderRadius,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.input.text, marginLeft: 8 },

  // ERROR
  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 12, gap: 8,
  },
  errorText: { color: T.icon.error, fontSize: 13, flex: 1 },

  // RESUMEN
  resumen: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: T.cards.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cards.border,
    paddingVertical: 12,
  },
  resumenItem: { flex: 1, alignItems: "center" },
  resumenNum: { fontSize: 22, fontWeight: "800", color: T.text.primary },
  resumenLabel: { fontSize: 11, color: T.text.secondary, marginTop: 2, fontWeight: "500" },
  resumenDivider: { width: 1, backgroundColor: T.cards.border },

  // LISTA
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10, paddingTop: 4 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: T.text.secondary, fontSize: 14 },

  // TARJETA
  card: {
    backgroundColor: T.cards.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.cards.border,
    padding: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardCritica: { borderColor: "#FECACA", backgroundColor: "#FFFAFA" },
  cardInactiva: { opacity: 0.6 },

  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  placa: { fontSize: 20, fontWeight: "800", color: T.text.primary, letterSpacing: 1 },
  tipoLabel: { fontSize: 11, color: T.text.secondary, marginTop: 3, fontWeight: "500" },

  // BADGE ESTADO
  badge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1,
  },
  badgeActivo: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeInactivo: { backgroundColor: "#F1F5F9", borderColor: T.cards.border },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // FILA INFO
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoValue: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },

  // SOAT ESTADO
  soatContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  soatIcono: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
  },
  soatEtiqueta: { fontSize: 10, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  soatEstado: { fontSize: 13, fontWeight: "700", marginTop: 1 },
  soatFecha: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  diasBadge: {
    minWidth: 32, height: 32, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  diasBadgeText: { color: "#fff", fontWeight: "900", fontSize: 13 },

  // MODALES
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: T.cards.border,
    maxHeight: "93%", paddingBottom: 24,
  },
  modalHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: T.text.primary },
  modalBody: { padding: 20 },
  modalFoot: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: T.cards.border,
  },
  modalDivider: { height: 1, backgroundColor: T.cards.border, marginVertical: 16 },
  modalSeparador: { height: 1, backgroundColor: T.cards.border, marginHorizontal: 20, marginVertical: 6 },
  modalEmpty: { alignItems: "center", paddingVertical: 32, gap: 10 },
  modalEmptyText: { fontSize: 13, color: T.text.secondary },

  // SECCIÓN LABEL
  sectionLabel: { fontSize: 12, fontWeight: "700", color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },

  // FIELDS
  fieldLabel: { fontSize: 13, fontWeight: "600", color: T.text.secondary, marginBottom: 6, marginTop: 12 },
  fieldHint: { fontSize: 11, color: T.text.tertiary, marginTop: 3 },

  // INPUTS
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.background, borderRadius: 12,
    borderWidth: 1, borderColor: "transparent",
    paddingHorizontal: 12, paddingVertical: 13, marginBottom: 2,
  },
  inputDisabled: { backgroundColor: "#F9FAFB", borderColor: "#E5E7EB" },
  inputAutoFill: { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7", borderWidth: 1 },
  inputPlaceholder: { color: T.text.tertiary },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 15, color: T.text.primary },

  // SWITCHES
  switchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 14,
    marginBottom: 10, borderWidth: 1, borderColor: "transparent",
  },
  switchRowError: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  switchTitle: { fontSize: 14, fontWeight: "600", color: T.text.primary },
  switchHint: { fontSize: 11, color: T.text.tertiary, marginTop: 2 },

  // VALIDACIÓN
  validationBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, marginTop: 4,
  },
  validationText: { flex: 1, fontSize: 12, color: "#991B1B", fontWeight: "500" },

  // AUTO BADGE
  autoBadge: { backgroundColor: "#D1FAE5", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  autoBadgeText: { fontSize: 10, fontWeight: "700", color: "#059669" },

  // LISTA MODAL
  modalItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalItemSelected: { backgroundColor: "#F0FDF4" },
  modalItemText: { flex: 1, fontSize: 15, color: T.text.primary },

  // BOTONES
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
  btnSaveDisabled: { opacity: 0.45, backgroundColor: "#94A3B8" },

  // CONFIRMACIÓN DESACTIVACIÓN
  confirmBody: { alignItems: "center", gap: 12, paddingBottom: 8 },
  confirmIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center",
  },
  confirmTitle: { fontSize: 16, fontWeight: "800", textAlign: "center", color: T.text.primary },
  confirmSubtext: { fontSize: 13, color: T.text.secondary, textAlign: "center", lineHeight: 20 },
  confirmCard: {
    width: "100%", backgroundColor: "#F8FAFC",
    borderRadius: 12, borderWidth: 1, borderColor: T.cards.border, padding: 16,
  },
});
