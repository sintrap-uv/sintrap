/**
 * vehiculos.jsx
 * Pantalla: Gestión de vehículos
 */

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
import { getCurrentUser } from "../../services/auth";
import Header from "../../components/Header";
import theme from "../../constants/theme";

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

  // Modal conductor
  const [modalConductorVisible, setModalConductorVisible] = useState(false);

  // Modal tipo vehículo
  const [modalTipoVisible, setModalTipoVisible] = useState(false);

  // Modal confirmación borrado
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [paraEliminar, setParaEliminar] = useState(null);
  const [eliminando, setEliminando] = useState(false);
  const [tieneDependencias, setTieneDependencias] = useState("ninguna");
  const [infoDependencia, setInfoDependencia] = useState(null);

  // Función para ir al perfil (cuando se presiona el engranaje)
  const handleGoToProfile = () => {
    router.push("/home?tab=perfil");
  };

  // ── FETCH VEHÍCULOS ──────────────────────────────────────────────────────
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
          tipo_vehiculo ( id, nombre )
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
        .select("id, nombre, descripcion")
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
      setFormFechaInicio(selectedDate.toISOString().split("T")[0]);
    }
  };

  const onChangeVencimiento = (event, selectedDate) => {
    setShowPickerVencimiento(false);
    if (selectedDate) {
      setFormFechaVencimiento(selectedDate.toISOString().split("T")[0]);
    }
  };

  async function handleGuardar() {
    if (!editando) return;
    setGuardando(true);

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
    } catch (err) {
      setGlobalError(`No se pudo guardar: ${err.message}`);
      setVehiculos(prev);
    } finally {
      setGuardando(false);
    }
  }

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
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={[s.badge, v.activo ? s.badgeActivo : s.badgeInactivo]}>
            <Text style={[s.badgeText, { color: v.activo ? "#16A34A" : T.text.secondary }]}>
              {v.activo ? "Activo" : "Inactivo"}
            </Text>
          </View>
          <View style={s.cardActions}>
            <TouchableOpacity onPress={() => abrirEdicion(v)} activeOpacity={0.7}>
              <Ionicons name="create-outline" size={22} color={T.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => pedirConfirmacion(v)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={22} color={T.icon.error} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.placa}>{v.placa}</Text>

        <View style={s.cardInfo}>
          <View style={s.infoRow}>
            <Ionicons name="person-outline" size={14} color={T.icon.default} />
            <Text style={s.infoValue}>{nombreConductor}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="bus-outline" size={14} color={T.icon.default} />
            <Text style={s.infoValue}>{tipoNombre}</Text>
          </View>
          <View style={s.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={v.seguro ? "#16A34A" : T.icon.error} />
            <Text style={[s.infoValue, { color: v.seguro ? "#16A34A" : T.icon.error }]}>
              {v.seguro ? "Seguro vigente" : "Sin seguro"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

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

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.input.placeholder} style={{ marginRight: 8 }} />
        <TextInput
          style={s.searchInput}
          placeholder="Buscar vehículo..."
          placeholderTextColor={T.input.placeholder}
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Error global */}
      {globalError && (
        <TouchableOpacity style={s.errorBanner} onPress={() => setGlobalError(null)}>
          <Ionicons name="warning-outline" size={14} color={T.icon.error} style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{globalError}  (toca para cerrar)</Text>
        </TouchableOpacity>
      )}

      {/* Lista */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={T.Headers.innerColor} />
          <Text style={s.loadingText}>Cargando vehículos…</Text>
        </View>
      ) : vehiculosFiltrados.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="bus-outline" size={48} color={T.cards.border} />
          <Text style={s.loadingText}>
            {busqueda ? "Sin resultados" : "No hay vehículos registrados"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={vehiculosFiltrados}
          keyExtractor={(v) => String(v.id)}
          renderItem={renderVehiculo}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.Headers.innerColor}
              colors={[T.Headers.innerColor]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal — Editar Vehículo (resto igual, sin cambios) */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={cerrarEdicion}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Editar vehículo</Text>
              <TouchableOpacity onPress={cerrarEdicion}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody}>
              <Text style={s.fieldLabel}>Estado</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 }}>
                <Text>Activo</Text>
                <Switch value={formActivo} onValueChange={setFormActivo} />
              </View>

              <Text style={s.fieldLabel}>Seguro vigente</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 8 }}>
                <Text>SOAT activo</Text>
                <Switch value={formSeguro} onValueChange={setFormSeguro} />
              </View>

              {formSeguro && (
                <>
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

              <Text style={s.fieldLabel}>Tipo de vehículo</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalTipoVisible(true)}>
                <Ionicons name="car-outline" size={20} color={T.text.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>{tipoNombreSeleccionado}</Text>
              </TouchableOpacity>

              <Text style={s.fieldLabel}>Conductor asignado</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalConductorVisible(true)}>
                <Ionicons name="person-outline" size={20} color={T.text.secondary} style={s.inputIcon} />
                <Text style={s.inputText}>{conductorNombreSeleccionado}</Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={s.modalFoot}>
              <TouchableOpacity style={s.btnCancel} onPress={cerrarEdicion}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleGuardar} disabled={guardando}>
                {guardando ? <ActivityIndicator color="#fff" /> : <Text style={s.btnSaveText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                  <Ionicons name="person-outline" size={20} color={T.text.secondary} />
                  <Text style={s.modalItemText}>{c.nombre}</Text>
                  {formConductorId === c.id && <Ionicons name="checkmark" size={20} color="#22C55E" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal seleccionar tipo vehículo */}
      <Modal visible={modalTipoVisible} transparent animationType="slide" onRequestClose={() => setModalTipoVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar tipo</Text>
              <TouchableOpacity onPress={() => setModalTipoVisible(false)}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
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
                  <Ionicons name="bus-outline" size={20} color={T.text.secondary} />
                  <Text style={s.modalItemText}>{t.nombre}</Text>
                  {formTipoVehiculoId === t.id && <Ionicons name="checkmark" size={20} color="#22C55E" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </View>
  );
}

// Estilos
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.input.background,
    borderWidth: 1, borderColor: T.input.border,
    borderRadius: T.input.borderRadius,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.input.text },

  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12,
  },
  errorText: { color: T.icon.error, fontSize: 13, flex: 1 },

  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: T.text.secondary, fontSize: 14 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12, paddingTop: 8 },

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
  cardActions: { flexDirection: "row", gap: 12 },
  placa: { fontSize: 20, fontWeight: "800", color: T.text.primary, letterSpacing: 1 },

  badge: { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeActivo: { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeInactivo: { backgroundColor: "#F1F5F9", borderColor: T.cards.border },
  badgeText: { fontSize: 11, fontWeight: "600" },

  cardInfo: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoValue: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },

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

  fieldLabel: { fontSize: 13, fontWeight: "600", color: T.text.secondary, marginBottom: 6, marginTop: 14 },
  fieldHint: { fontSize: 11, color: T.text.tertiary, marginTop: 3, marginBottom: 4 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4,
  },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 15, color: T.text.primary },

  modalItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalItemSelected: { backgroundColor: "#F0FDF4" },
  modalItemText: { flex: 1, fontSize: 15, color: T.text.primary },

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

  confirmBody: { alignItems: "center", padding: 20, gap: 12 },
  confirmIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  confirmTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  confirmSubtext: { fontSize: 13, color: T.text.secondary, textAlign: "center", lineHeight: 20 },
  confirmCard: {
    width: "100%", backgroundColor: "#F8FAFC",
    borderRadius: 12, borderWidth: 1, borderColor: T.cards.border,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  confirmRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  confirmRowLabel: { fontSize: 13, color: T.text.secondary, flex: 1 },
  confirmRowValue: { fontSize: 13, fontWeight: "700", color: T.text.primary },
  confirmDivider: { height: 1, backgroundColor: T.cards.border },
});