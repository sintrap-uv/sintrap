 /**
 * vehiculos.jsx
  
 */

import { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Modal,
  Switch, ActivityIndicator, StyleSheet, ScrollView,
  RefreshControl, TextInput, Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { getCurrentUser } from "../../services/auth";
import theme from "../../constants/theme";

const T = theme.lightMode;

export default function VehiculosScreen() {
  const [vehiculos,            setVehiculos]            = useState([]);
  const [conductores,          setConductores]          = useState([]);
  const [tiposVehiculo,        setTiposVehiculo]        = useState([]);
  const [loading,              setLoading]              = useState(true);
  const [refreshing,           setRefreshing]           = useState(false);
  const [globalError,          setGlobalError]          = useState(null);
  const [busqueda,             setBusqueda]             = useState("");

  // Modal edición
  const [modalVisible,         setModalVisible]         = useState(false);
  const [editando,             setEditando]             = useState(null);
  const [formActivo,           setFormActivo]           = useState(true);
  const [formSeguro,           setFormSeguro]           = useState(false);
  const [formConductorId,      setFormConductorId]      = useState(null);
  const [formTipoVehiculoId,   setFormTipoVehiculoId]   = useState(null);
  const [formFechaInicio,      setFormFechaInicio]      = useState("");
  const [formFechaVencimiento, setFormFechaVencimiento] = useState("");
  const [showPickerInicio,     setShowPickerInicio]     = useState(false);
  const [showPickerVencimiento,setShowPickerVencimiento]= useState(false);
  const [guardando,            setGuardando]            = useState(false);

  // Modal conductor
  const [modalConductorVisible, setModalConductorVisible] = useState(false);

  // Modal tipo vehículo
  const [modalTipoVisible, setModalTipoVisible] = useState(false);

  // Modal confirmación borrado
  const [confirmVisible,   setConfirmVisible]   = useState(false);
  const [paraEliminar,     setParaEliminar]     = useState(null);
  const [eliminando,       setEliminando]       = useState(false);
  const [tieneDependencias,setTieneDependencias]= useState("ninguna");
  const [infoDependencia,  setInfoDependencia]  = useState(null);

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

  // ── FETCH CONDUCTORES ────────────────────────────────────────────────────
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

  // ── FETCH TIPOS DE VEHÍCULO ──────────────────────────────────────────────
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

  // ── FILTRO BÚSQUEDA ──────────────────────────────────────────────────────
  const vehiculosFiltrados = vehiculos.filter((v) =>
    v.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.profiles?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── ABRIR EDICIÓN ────────────────────────────────────────────────────────
  function abrirEdicion(v) {
    setEditando(v);
    setFormActivo(v.activo ?? true);
    setFormSeguro(v.seguro ?? false);
    setFormConductorId(v.conductor_id ?? null);
    setFormTipoVehiculoId(v.tipo_vehiculo_id ?? null);
    setFormFechaInicio(v.fecha_inicio ?? "");
    setFormFechaVencimiento(v.fecha_vencimiento ?? "");
    setModalVisible(true);
  }

  function cerrarEdicion() {
    setModalVisible(false);
    setEditando(null);
  }

  // ── PICKERS DE FECHA ─────────────────────────────────────────────────────
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

  // ── UPDATE ───────────────────────────────────────────────────────────────
  async function handleGuardar() {
    if (!editando) return;
    setGuardando(true);

    const conductorSeleccionado = conductores.find((c) => c.id === formConductorId) ?? null;
    const tipoSeleccionado = tiposVehiculo.find((t) => t.id === formTipoVehiculoId) ?? null;

    // Optimistic UI
    const prev = vehiculos;
    setVehiculos((list) =>
      list.map((v) =>
        v.id === editando.id
          ? {
              ...v,
              activo:            formActivo,
              seguro:            formSeguro,
              conductor_id:      formConductorId,
              tipo_vehiculo_id:  formTipoVehiculoId,
              fecha_inicio:      formSeguro ? formFechaInicio      : null,
              fecha_vencimiento: formSeguro ? formFechaVencimiento : null,
              profiles:          conductorSeleccionado,
              tipo_vehiculo:     tipoSeleccionado,
            }
          : v
      )
    );
    cerrarEdicion();

    try {
      const { error } = await supabase
        .from("vehiculos")
        .update({
          activo:            formActivo,
          seguro:            formSeguro,
          conductor_id:      formConductorId,       // null = quitar conductor
          tipo_vehiculo_id:  formTipoVehiculoId,
          fecha_inicio:      formSeguro ? formFechaInicio      : null,
          fecha_vencimiento: formSeguro ? formFechaVencimiento : null,
          // "capacidad" nunca se toca aquí
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

  // ── VERIFICAR Y ELIMINAR ─────────────────────────────────────────────────
  async function pedirConfirmacion(v) {
    setParaEliminar(v);
    try {
      const { data: turnosActivos, error } = await supabase
        .from("turnos")
        .select("id, fecha, conductor_id, estado, profiles(nombre)")
        .eq("vehiculo_id", v.id)
        .eq("estado", "en_curso")
        .limit(1);

      if (error) throw error;

      if (turnosActivos?.length > 0) {
        const turno = turnosActivos[0];
        setTieneDependencias("bloqueado");
        setInfoDependencia({
          conductor: turno.profiles?.nombre ?? "Conductor desconocido",
          fecha: turno.fecha,
        });
      } else {
        const { count } = await supabase
          .from("turnos")
          .select("*", { count: "exact", head: true })
          .eq("vehiculo_id", v.id);

        setTieneDependencias(count > 0 ? "historial" : "ninguna");
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

  // ── RENDER TARJETA ───────────────────────────────────────────────────────
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

  // ── NOMBRE DEL CONDUCTOR SELECCIONADO ────────────────────────────────────
  const conductorNombreSeleccionado = formConductorId
    ? (conductores.find((c) => c.id === formConductorId)?.nombre ?? "Conductor")
    : "Sin conductor asignado";

  const tipoNombreSeleccionado = formTipoVehiculoId
    ? (tiposVehiculo.find((t) => t.id === formTipoVehiculoId)?.nombre ?? "Tipo")
    : "Seleccionar tipo";

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <View style={s.container}>

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

       {/* ══════════════════════════════════════
          MODAL — EDITAR VEHÍCULO
      ══════════════════════════════════════ */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={cerrarEdicion}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Editar Vehículo</Text>
              <TouchableOpacity onPress={cerrarEdicion}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>

              {/* Placa solo lectura */}
              <Text style={s.fieldLabel}>Placa del vehículo</Text>
              <View style={s.inputRow}>
                <Ionicons name="bus-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                <Text style={s.inputText}>{editando?.placa}</Text>
              </View>
              <Text style={s.fieldHint}>La placa no se edita en este módulo.</Text>

              {/* Estado activo */}
              <Text style={s.fieldLabel}>Estado del vehículo</Text>
              <View style={s.inputRow}>
                <Ionicons name="power-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                <Text style={{ flex: 1, color: T.text.primary }}>
                  {formActivo ? "Activo en servicio" : "Fuera de servicio"}
                </Text>
                <Switch
                  value={formActivo}
                  onValueChange={setFormActivo}
                  trackColor={{ false: T.cards.border, true: "#BBF7D0" }}
                  thumbColor={formActivo ? T.Headers.innerColor : T.text.secondary}
                />
              </View>

              {/* Conductor */}
              <Text style={s.fieldLabel}>Conductor asignado</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalConductorVisible(true)}>
                <Ionicons name="person-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                <Text style={[s.inputText, !formConductorId && { color: T.input.placeholder }]}>
                  {conductorNombreSeleccionado}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color={T.text.secondary} />
              </TouchableOpacity>

              {/* Tipo de vehículo */}
              <Text style={s.fieldLabel}>Tipo de vehículo</Text>
              <TouchableOpacity style={s.inputRow} onPress={() => setModalTipoVisible(true)}>
                <Ionicons name="car-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                <Text style={[s.inputText, !formTipoVehiculoId && { color: T.input.placeholder }]}>
                  {tipoNombreSeleccionado}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color={T.text.secondary} />
              </TouchableOpacity>

              {/* Seguro */}
              <Text style={s.fieldLabel}>Seguro (SOAT)</Text>
              <View style={s.inputRow}>
                <Ionicons name="shield-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                <Text style={{ flex: 1, color: T.text.primary }}>¿Tiene SOAT?</Text>
                <Switch
                  value={formSeguro}
                  onValueChange={setFormSeguro}
                  trackColor={{ false: T.cards.border, true: "#BBF7D0" }}
                  thumbColor={formSeguro ? T.Headers.innerColor : T.text.secondary}
                />
              </View>

              {/* Fechas SOAT — solo si tiene seguro */}
              {formSeguro && (
                <View>
                  <Text style={s.fieldLabel}>Inicio del SOAT</Text>
                  <TouchableOpacity style={s.inputRow} onPress={() => setShowPickerInicio(true)}>
                    <Ionicons name="calendar-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                    <Text style={[s.inputText, !formFechaInicio && { color: T.input.placeholder }]}>
                      {formFechaInicio || "AA/MM/DD"}
                    </Text>
                  </TouchableOpacity>
                  {showPickerInicio && (
                    <DateTimePicker
                      value={formFechaInicio ? new Date(formFechaInicio) : new Date()}
                      mode="date"
                      onChange={onChangeInicio}
                    />
                  )}

                  <Text style={s.fieldLabel}>Vencimiento del SOAT</Text>
                  <TouchableOpacity style={s.inputRow} onPress={() => setShowPickerVencimiento(true)}>
                    <Ionicons name="calendar-outline" size={18} color={T.icon.default} style={s.inputIcon} />
                    <Text style={[s.inputText, !formFechaVencimiento && { color: T.input.placeholder }]}>
                      {formFechaVencimiento || "AA/MM/DD"}
                    </Text>
                  </TouchableOpacity>
                  {showPickerVencimiento && (
                    <DateTimePicker
                      value={formFechaVencimiento ? new Date(formFechaVencimiento) : new Date()}
                      mode="date"
                      onChange={onChangeVencimiento}
                    />
                  )}
                </View>
              )}

            </ScrollView>

            <View style={s.modalFoot}>
              <TouchableOpacity style={s.btnCancel} onPress={cerrarEdicion} disabled={guardando}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleGuardar} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnSaveText}>Guardar cambios</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL — SELECCIONAR CONDUCTOR
      ══════════════════════════════════════ */}
      <Modal visible={modalConductorVisible} animationType="slide" transparent onRequestClose={() => setModalConductorVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Seleccionar Conductor</Text>
              <TouchableOpacity onPress={() => setModalConductorVisible(false)}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {/* Opción: quitar conductor */}
              <TouchableOpacity
                style={[s.modalItem, formConductorId === null && s.modalItemSelected]}
                onPress={() => { setFormConductorId(null); setModalConductorVisible(false); }}
              >
                <Ionicons name="person-remove-outline" size={20} color={T.icon.error} />
                <Text style={[s.modalItemText, { color: T.icon.error }]}>Sin conductor asignado</Text>
                {formConductorId === null && <Ionicons name="checkmark" size={18} color={T.Headers.innerColor} />}
              </TouchableOpacity>

              {conductores.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.modalItem, formConductorId === c.id && s.modalItemSelected]}
                  onPress={() => { setFormConductorId(c.id); setModalConductorVisible(false); }}
                >
                  <Ionicons name="person-circle-outline" size={20} color={T.icon.active} />
                  <Text style={[s.modalItemText, formConductorId === c.id && { color: T.Headers.innerColor, fontWeight: "700" }]}>
                    {c.nombre}
                  </Text>
                  {formConductorId === c.id && <Ionicons name="checkmark" size={18} color={T.Headers.innerColor} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL — SELECCIONAR TIPO VEHÍCULO
      ══════════════════════════════════════ */}
      <Modal visible={modalTipoVisible} animationType="slide" transparent onRequestClose={() => setModalTipoVisible(false)}>
        <View style={s.overlay}>
          <View style={s.modalBox}>
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Tipo de Vehículo</Text>
              <TouchableOpacity onPress={() => setModalTipoVisible(false)}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {tiposVehiculo.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[s.modalItem, formTipoVehiculoId === t.id && s.modalItemSelected]}
                  onPress={() => { setFormTipoVehiculoId(t.id); setModalTipoVisible(false); }}
                >
                  <Ionicons name="car-outline" size={20} color={T.icon.active} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.modalItemText, formTipoVehiculoId === t.id && { color: T.Headers.innerColor, fontWeight: "700" }]}>
                      {t.nombre}
                    </Text>
                    {t.descripcion && (
                      <Text style={{ fontSize: 12, color: T.text.tertiary }}>{t.descripcion}</Text>
                    )}
                  </View>
                  {formTipoVehiculoId === t.id && <Ionicons name="checkmark" size={18} color={T.Headers.innerColor} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL — CONFIRMAR ELIMINACIÓN
      ══════════════════════════════════════ */}
      <Modal visible={confirmVisible} animationType="fade" transparent onRequestClose={() => setConfirmVisible(false)}>
        <View style={s.overlay}>
          <View style={[s.modalBox, { maxHeight: 420 }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, {
                color: tieneDependencias === "bloqueado" ? T.icon.error :
                       tieneDependencias === "historial"  ? T.icon.alert : T.icon.error
              }]}>
                {tieneDependencias === "bloqueado" ? "Acción bloqueada" :
                 tieneDependencias === "historial"  ? "Atención" : "Eliminar vehículo"}
              </Text>
              <TouchableOpacity onPress={() => setConfirmVisible(false)}>
                <Ionicons name="close" size={24} color={T.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={s.confirmBody}>
              <View style={[s.confirmIconCircle, {
                backgroundColor:
                  tieneDependencias === "bloqueado" ? "#FEF2F2" :
                  tieneDependencias === "historial"  ? "#FFFBEB" : "#FEF2F2"
              }]}>
                <Ionicons
                  name={
                    tieneDependencias === "bloqueado" ? "ban-outline" :
                    tieneDependencias === "historial"  ? "warning-outline" : "trash-outline"
                  }
                  size={36}
                  color={
                    tieneDependencias === "bloqueado" ? T.icon.error :
                    tieneDependencias === "historial"  ? T.icon.alert : T.icon.error
                  }
                />
              </View>

              {tieneDependencias === "bloqueado" && (
                <>
                  <Text style={[s.confirmTitle, { color: T.icon.error }]}>No se puede eliminar</Text>
                  <View style={s.confirmCard}>
                    <View style={s.confirmRow}>
                      <Ionicons name="bus-outline" size={16} color={T.text.secondary} />
                      <Text style={s.confirmRowLabel}>Vehículo</Text>
                      <Text style={s.confirmRowValue}>{paraEliminar?.placa}</Text>
                    </View>
                    <View style={s.confirmDivider} />
                    <View style={s.confirmRow}>
                      <Ionicons name="person-outline" size={16} color={T.text.secondary} />
                      <Text style={s.confirmRowLabel}>Conductor</Text>
                      <Text style={s.confirmRowValue}>{infoDependencia?.conductor}</Text>
                    </View>
                    <View style={s.confirmDivider} />
                    <View style={s.confirmRow}>
                      <Ionicons name="calendar-outline" size={16} color={T.text.secondary} />
                      <Text style={s.confirmRowLabel}>Fecha</Text>
                      <Text style={s.confirmRowValue}>{infoDependencia?.fecha}</Text>
                    </View>
                  </View>
                  <Text style={s.confirmSubtext}>Espera a que el turno finalice.</Text>
                </>
              )}

              {tieneDependencias === "historial" && (
                <>
                  <Text style={[s.confirmTitle, { color: T.icon.alert }]}>Tiene historial de turnos</Text>
                  <Text style={s.confirmSubtext}>
                    El vehículo{" "}
                    <Text style={{ fontWeight: "700", color: T.text.primary }}>{paraEliminar?.placa}</Text>
                    {" "}se desactivará en lugar de eliminarse.
                  </Text>
                </>
              )}

              {tieneDependencias === "ninguna" && (
                <>
                  <Text style={[s.confirmTitle, { color: T.icon.error }]}>¿Eliminar vehículo?</Text>
                  <Text style={s.confirmSubtext}>
                    El vehículo{" "}
                    <Text style={{ fontWeight: "700", color: T.text.primary }}>{paraEliminar?.placa}</Text>
                    {" "}será eliminado permanentemente.
                  </Text>
                </>
              )}
            </View>

            <View style={s.modalFoot}>
              <TouchableOpacity style={s.btnCancel} onPress={() => setConfirmVisible(false)} disabled={eliminando}>
                <Text style={s.btnCancelText}>
                  {tieneDependencias === "bloqueado" ? "Entendido" : "Cancelar"}
                </Text>
              </TouchableOpacity>
              {tieneDependencias !== "bloqueado" && (
                <TouchableOpacity
                  style={[s.btnSave, { backgroundColor: tieneDependencias === "historial" ? T.icon.alert : T.icon.error }]}
                  onPress={handleEliminar}
                  disabled={eliminando}
                >
                  {eliminando
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={s.btnSaveText}>
                        {tieneDependencias === "historial" ? "Desactivar" : "Sí, eliminar"}
                      </Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: T.background },

  // Buscador
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.input.background,
    borderWidth: 1, borderColor: T.input.border,
    borderRadius: T.input.borderRadius,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.input.text },

  // Error
  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, padding: 12,
  },
  errorText: { color: T.icon.error, fontSize: 13, flex: 1 },

  // Loading / empty
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: T.text.secondary, fontSize: 14 },

  // Lista
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12, paddingTop: 8 },

  // Tarjeta
  card: {
    backgroundColor: T.cards.background,
    borderRadius: T.cards.borderRadius,
    borderWidth: 1, borderColor: T.cards.border,
    padding: 16, gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardActions: { flexDirection: "row", gap: 12 },
  placa:       { fontSize: 20, fontWeight: "800", color: T.text.primary, letterSpacing: 1 },

  badge:         { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeActivo:   { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeInactivo: { backgroundColor: "#F1F5F9", borderColor: T.cards.border },
  badgeText:     { fontSize: 11, fontWeight: "600" },

  cardInfo:  { gap: 8 },
  infoRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  infoValue: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },

  // Modal base
  overlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox:  {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: T.cards.border,
    maxHeight: "92%", paddingBottom: 24,
  },
  modalHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalTitle:{ fontSize: 18, fontWeight: "800", color: T.text.primary },
  modalBody: { padding: 20 },
  modalFoot: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: T.cards.border,
  },

  // Inputs del formulario
  fieldLabel: { fontSize: 13, fontWeight: "600", color: T.text.secondary, marginBottom: 6, marginTop: 14 },
  fieldHint:  { fontSize: 11, color: T.text.tertiary, marginTop: 3, marginBottom: 4 },
  inputRow:   {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.background, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 12, marginBottom: 4,
  },
  inputIcon:  { marginRight: 10 },
  inputText:  { flex: 1, fontSize: 15, color: T.text.primary },

  // Modal items (conductor / tipo)
  modalItem:         {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalItemSelected: { backgroundColor: "#F0FDF4" },
  modalItemText:     { flex: 1, fontSize: 15, color: T.text.primary },

  // Botones modal
  btnCancel:     {
    flex: 1, borderWidth: 1, borderColor: T.cards.border,
    borderRadius: T.Button.secondary.borderRadius,
    paddingVertical: 13, alignItems: "center",
    backgroundColor: T.Button.secondary.background,
  },
  btnCancelText: { color: T.text.secondary, fontWeight: "700", fontSize: 14 },
  btnSave:       {
    flex: 1, backgroundColor: T.Button.primary.background,
    borderRadius: T.Button.primary.borderRadius,
    paddingVertical: 13, alignItems: "center",
  },
  btnSaveText:   { color: "#fff", fontWeight: "800", fontSize: 14 },

   // Confirm
  confirmBody:       { alignItems: "center", padding: 20, gap: 12 },
  confirmIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  confirmTitle:      { fontSize: 16, fontWeight: "800", textAlign: "center" },
  confirmSubtext:    { fontSize: 13, color: T.text.secondary, textAlign: "center", lineHeight: 20 },
  confirmCard:       {
    width: "100%", backgroundColor: "#F8FAFC",
    borderRadius: 12, borderWidth: 1, borderColor: T.cards.border,
    paddingHorizontal: 16, paddingVertical: 4,
  },
  confirmRow:        { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 },
  confirmRowLabel:   { fontSize: 13, color: T.text.secondary, flex: 1 },
  confirmRowValue:   { fontSize: 13, fontWeight: "700", color: T.text.primary },
  confirmDivider:    { height: 1, backgroundColor: T.cards.border },
});