 /**
 * vehiculos.jsx
 * Pantalla de gestión de vehículos — SINTRAP
 * Ruta Expo Router: app/(admin)/vehiculos.jsx
 *
 * Columnas usadas: id, placa, seguro (bool), conductor_id (uuid FK → profiles), activo (bool)
 * NUNCA se toca la columna "capacidad".
 *
 * Dependencias ya instaladas en tu proyecto:
 *   @supabase/supabase-js  ← ya lo tienes
 *
 * Si necesitas el Picker: expo install @react-native-picker/picker
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  Switch,
  ActivityIndicator,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
} from "react-native";
import { supabase } from "../../services/supabase"; // ruta correcta según tu proyecto

// ─── COLORES ──────────────────────────────────────────────────────────────────
const C = {
  bg:        "#0B0E13",
  surface:   "#13171F",
  card:      "#191D27",
  border:    "#252A36",
  accent:    "#F5C518",
  accentDim: "rgba(245,197,24,0.12)",
  danger:    "#E05A2B",
  dangerDim: "rgba(224,90,43,0.12)",
  safe:      "#3ECF8E",
  safeDim:   "rgba(62,207,142,0.12)",
  text:      "#EDF0F7",
  muted:     "#6B7280",
  white:     "#FFFFFF",
};

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function VehiculosScreen() {
  const [vehiculos,   setVehiculos]   = useState([]);
  const [conductores, setConductores] = useState([]); // lista de profiles para el picker
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // Modal edición
  const [modalVisible, setModalVisible] = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [formActivo,   setFormActivo]   = useState(true);
  const [formSeguro,   setFormSeguro]   = useState(false);
  const [formConductorId, setFormConductorId] = useState(null);
  const [guardando,    setGuardando]    = useState(false);

  // Modal confirmación borrado
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [paraEliminar,   setParaEliminar]   = useState(null);
  const [eliminando,     setEliminando]     = useState(false);

  // ── FETCH VEHÍCULOS ────────────────────────────────────────────────────────
  const fetchVehiculos = useCallback(async () => {
    setGlobalError(null);
    try {
      // Join con profiles para obtener el nombre del conductor
      // IMPORTANTE: no se selecciona "capacidad"
      const { data, error } = await supabase
        .from("vehiculos")
        .select(`
          id,
          placa,
          seguro,
          activo,
          conductor_id,
          profiles ( id, nombre )
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

  // ── FETCH CONDUCTORES (para el selector) ──────────────────────────────────
  const fetchConductores = useCallback(async () => {
    try {
      // Ajusta el filtro si tu tabla profiles tiene un campo de rol
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nombre")
        .eq("rol", "conductor")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setConductores(data || []);
    } catch (err) {
      // No es crítico, solo no se podrá cambiar conductor
      console.warn("No se pudieron cargar conductores:", err.message);
    }
  }, []);

  useEffect(() => {
    fetchVehiculos();
    fetchConductores();
  }, [fetchVehiculos, fetchConductores]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehiculos();
  };

  // ── ABRIR EDICIÓN ──────────────────────────────────────────────────────────
  function abrirEdicion(v) {
    setEditando(v);
    setFormActivo(v.activo ?? true);
    setFormSeguro(v.seguro ?? false);
    setFormConductorId(v.conductor_id ?? null);
    setModalVisible(true);
  }

  function cerrarEdicion() {
    setModalVisible(false);
    setEditando(null);
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  async function handleGuardar() {
    if (!editando) return;
    setGuardando(true);

    // Optimistic UI
    const prev = vehiculos;
    setVehiculos((list) =>
      list.map((v) =>
        v.id === editando.id
          ? {
              ...v,
              activo:       formActivo,
              seguro:       formSeguro,
              conductor_id: formConductorId,
              profiles:     conductores.find((c) => c.id === formConductorId) ?? v.profiles,
            }
          : v
      )
    );
    cerrarEdicion();

    try {
      const { error } = await supabase
        .from("vehiculos")
        .update({
          activo:       formActivo,
          seguro:       formSeguro,
          conductor_id: formConductorId,
          // "capacidad" nunca se toca aquí
        })
        .eq("id", editando.id);

      if (error) throw error;
    } catch (err) {
      setGlobalError(`No se pudo guardar: ${err.message}`);
      setVehiculos(prev); // revertir
    } finally {
      setGuardando(false);
    }
  }

  // ── DELETE ─────────────────────────────────────────────────────────────────
  function pedirConfirmacion(v) {
    setParaEliminar(v);
    setConfirmVisible(true);
  }

  async function handleEliminar() {
    if (!paraEliminar) return;
    setEliminando(true);

    const prev = vehiculos;
    setVehiculos((list) => list.filter((v) => v.id !== paraEliminar.id));
    setConfirmVisible(false);

    try {
      const { error } = await supabase
        .from("vehiculos")
        .delete()
        .eq("id", paraEliminar.id);

      if (error) throw error;
    } catch (err) {
      setGlobalError(`No se pudo eliminar: ${err.message}`);
      setVehiculos(prev);
    } finally {
      setEliminando(false);
      setParaEliminar(null);
    }
  }

  // ── RENDER TARJETA ─────────────────────────────────────────────────────────
  function renderVehiculo({ item: v, index }) {
    const nombreConductor = v.profiles?.nombre ?? "Sin conductor";
    return (
      <View style={[s.card, { opacity: v.activo ? 1 : 0.6 }]}>
        {/* Franja lateral de estado */}
        <View style={[s.cardStripe, { backgroundColor: v.activo ? C.safe : C.muted }]} />

        <View style={s.cardBody}>
          {/* Encabezado */}
          <View style={s.cardHeader}>
            <Text style={s.placa}>{v.placa}</Text>
            <View style={[s.badge, v.activo ? s.badgeActivo : s.badgeInactivo]}>
              <Text style={[s.badgeText, { color: v.activo ? C.safe : C.muted }]}>
                {v.activo ? "Activo" : "Inactivo"}
              </Text>
            </View>
          </View>

          {/* Info */}
          <View style={s.cardInfo}>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Conductor</Text>
              <Text style={s.infoValue}>{nombreConductor}</Text>
            </View>
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Seguro</Text>
              <View style={[s.badge, v.seguro ? s.badgeActivo : s.badgeInactivo]}>
                <Text style={[s.badgeText, { color: v.seguro ? C.safe : C.muted }]}>
                  {v.seguro ? "Vigente" : "Sin seguro"}
                </Text>
              </View>
            </View>
          </View>

          {/* Acciones */}
          <View style={s.cardActions}>
            <TouchableOpacity style={s.btnEdit} onPress={() => abrirEdicion(v)} activeOpacity={0.75}>
              <Text style={s.btnEditText}>✏ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.btnDel} onPress={() => pedirConfirmacion(v)} activeOpacity={0.75}>
              <Text style={s.btnDelText}>🗑 Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── RENDER PRINCIPAL ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Flota</Text>
          <Text style={s.headerSub}>Gestión de vehículos</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{vehiculos.length} unidades</Text>
        </View>
      </View>

      {/* Error global */}
      {globalError && (
        <TouchableOpacity style={s.errorBanner} onPress={() => setGlobalError(null)}>
          <Text style={s.errorText}>⚠ {globalError}  (toca para cerrar)</Text>
        </TouchableOpacity>
      )}

      {/* Lista */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={C.accent} />
          <Text style={s.loadingText}>Cargando vehículos…</Text>
        </View>
      ) : vehiculos.length === 0 ? (
        <View style={s.centered}>
          <Text style={s.emptyIcon}>🚌</Text>
          <Text style={s.emptyText}>No hay vehículos registrados</Text>
        </View>
      ) : (
        <FlatList
          data={vehiculos}
          keyExtractor={(v) => String(v.id)}
          renderItem={renderVehiculo}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ══════════════════════════════════════
          MODAL — EDITAR VEHÍCULO
      ══════════════════════════════════════ */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarEdicion}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>
            {/* Cabecera modal */}
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Editar Vehículo</Text>
              <TouchableOpacity onPress={cerrarEdicion} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
              {/* Placa (solo lectura — la placa identifica al vehículo, no se cambia aquí) */}
              <Text style={s.fieldLabel}>Placa</Text>
              <View style={s.fieldReadonly}>
                <Text style={s.fieldReadonlyText}>{editando?.placa}</Text>
              </View>
              <Text style={s.fieldHint}>La placa no se edita en este módulo.</Text>

              {/* Switch: Activo */}
              <View style={s.switchRow}>
                <View>
                  <Text style={s.fieldLabel}>Estado del vehículo</Text>
                  <Text style={s.fieldHint}>{formActivo ? "Activo en servicio" : "Fuera de servicio"}</Text>
                </View>
                <Switch
                  value={formActivo}
                  onValueChange={setFormActivo}
                  trackColor={{ false: C.border, true: C.safeDim }}
                  thumbColor={formActivo ? C.safe : C.muted}
                />
              </View>

              {/* Switch: Seguro */}
              <View style={s.switchRow}>
                <View>
                  <Text style={s.fieldLabel}>Seguro</Text>
                  <Text style={s.fieldHint}>{formSeguro ? "Seguro vigente" : "Sin seguro activo"}</Text>
                </View>
                <Switch
                  value={formSeguro}
                  onValueChange={setFormSeguro}
                  trackColor={{ false: C.border, true: C.safeDim }}
                  thumbColor={formSeguro ? C.safe : C.muted}
                />
              </View>

              {/* Selector de conductor */}
              <Text style={s.fieldLabel}>Conductor asignado</Text>
              {conductores.length === 0 ? (
                <Text style={s.fieldHint}>No se pudieron cargar conductores.</Text>
              ) : (
                <ScrollView
                  style={s.conductorList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {/* Opción: sin conductor */}
                  <TouchableOpacity
                    style={[s.conductorItem, formConductorId === null && s.conductorSelected]}
                    onPress={() => setFormConductorId(null)}
                  >
                    <Text style={[s.conductorName, formConductorId === null && { color: C.accent }]}>
                      Sin conductor asignado
                    </Text>
                    {formConductorId === null && <Text style={s.checkmark}>✓</Text>}
                  </TouchableOpacity>

                  {conductores.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.conductorItem, formConductorId === c.id && s.conductorSelected]}
                      onPress={() => setFormConductorId(c.id)}
                    >
                      <Text style={[s.conductorName, formConductorId === c.id && { color: C.accent }]}>
                        {c.nombre}
                      </Text>
                      {formConductorId === c.id && <Text style={s.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            {/* Botones */}
            <View style={s.modalFoot}>
              <TouchableOpacity style={s.btnCancel} onPress={cerrarEdicion} disabled={guardando}>
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSave} onPress={handleGuardar} disabled={guardando}>
                {guardando
                  ? <ActivityIndicator color={C.bg} size="small" />
                  : <Text style={s.btnSaveText}>Guardar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ══════════════════════════════════════
          MODAL — CONFIRMAR ELIMINACIÓN
      ══════════════════════════════════════ */}
      <Modal
        visible={confirmVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={s.overlay}>
          <View style={[s.modalBox, { maxHeight: 280 }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: C.danger }]}>Eliminar vehículo</Text>
              <TouchableOpacity onPress={() => setConfirmVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.confirmBody}>
              <Text style={s.confirmIcon}>🗑️</Text>
              <Text style={s.confirmText}>
                ¿Eliminar el vehículo{" "}
                <Text style={{ color: C.accent, fontWeight: "700" }}>
                  {paraEliminar?.placa}
                </Text>
                ?{"\n"}Esta acción no se puede deshacer.
              </Text>
            </View>

            <View style={s.modalFoot}>
              <TouchableOpacity
                style={s.btnCancel}
                onPress={() => setConfirmVisible(false)}
                disabled={eliminando}
              >
                <Text style={s.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnSave, { backgroundColor: C.danger }]}
                onPress={handleEliminar}
                disabled={eliminando}
              >
                {eliminando
                  ? <ActivityIndicator color={C.white} size="small" />
                  : <Text style={s.btnSaveText}>Sí, eliminar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── ESTILOS ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },

  // Header
  header:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  headerTitle:{ fontSize: 30, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  headerSub:  { fontSize: 12, color: C.muted, marginTop: 2 },
  headerBadge:{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6 },
  headerBadgeText: { fontSize: 11, color: C.muted, fontWeight: "600" },

  // Error
  errorBanner:{ backgroundColor: "rgba(224,90,43,0.12)", borderWidth: 1, borderColor: "rgba(224,90,43,0.3)", marginHorizontal: 16, marginBottom: 12, borderRadius: 10, padding: 12 },
  errorText:  { color: "#F9A07A", fontSize: 13 },

  // Loading / empty
  centered:   { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText:{ color: C.muted, fontSize: 14, marginTop: 8 },
  emptyIcon:  { fontSize: 40 },
  emptyText:  { color: C.muted, fontSize: 14 },

  // Lista
  list:       { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  // Tarjeta
  card:       { flexDirection: "row", backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: "hidden" },
  cardStripe: { width: 4 },
  cardBody:   { flex: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  placa:      { fontSize: 18, fontWeight: "800", color: C.accent, letterSpacing: 1 },

  badge:      { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeActivo:{ backgroundColor: C.safeDim, borderColor: "rgba(62,207,142,0.3)" },
  badgeInactivo:{ backgroundColor: "rgba(107,114,128,0.1)", borderColor: "rgba(107,114,128,0.3)" },
  badgeText:  { fontSize: 11, fontWeight: "600" },

  cardInfo:   { gap: 6 },
  infoRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  infoLabel:  { fontSize: 12, color: C.muted },
  infoValue:  { fontSize: 13, color: C.text, fontWeight: "500" },

  cardActions:{ flexDirection: "row", gap: 8 },
  btnEdit:    { flex: 1, backgroundColor: C.accentDim, borderWidth: 1, borderColor: "rgba(245,197,24,0.25)", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  btnEditText:{ color: C.accent, fontSize: 13, fontWeight: "700" },
  btnDel:     { flex: 1, backgroundColor: C.dangerDim, borderWidth: 1, borderColor: "rgba(224,90,43,0.25)", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  btnDelText: { color: C.danger, fontSize: 13, fontWeight: "700" },

  // Modal
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalBox:   { backgroundColor: C.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderColor: C.border, maxHeight: "85%", paddingBottom: 20 },
  modalHead:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: "800", color: C.text },
  modalClose: { fontSize: 20, color: C.muted, fontWeight: "600" },
  modalBody:  { padding: 20 },
  modalFoot:  { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },

  // Campos
  fieldLabel:   { fontSize: 11, fontWeight: "700", color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 16 },
  fieldHint:    { fontSize: 11, color: C.muted, marginTop: 4, marginBottom: 4 },
  fieldReadonly:{ backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: C.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12 },
  fieldReadonlyText: { color: C.accent, fontWeight: "700", fontSize: 15, letterSpacing: 1 },

  switchRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border },

  // Selector conductor
  conductorList:  { maxHeight: 180, borderWidth: 1, borderColor: C.border, borderRadius: 10, marginTop: 4, marginBottom: 8 },
  conductorItem:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  conductorSelected: { backgroundColor: C.accentDim },
  conductorName:  { fontSize: 14, color: C.text },
  checkmark:      { color: C.accent, fontSize: 16, fontWeight: "700" },

  // Botones modal
  btnCancel:  { flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnCancelText: { color: C.muted, fontWeight: "700", fontSize: 14 },
  btnSave:    { flex: 1, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  btnSaveText:{ color: C.bg, fontWeight: "800", fontSize: 14 },

  // Confirm
  confirmBody:{ alignItems: "center", padding: 24, gap: 12 },
  confirmIcon:{ fontSize: 36 },
  confirmText:{ color: C.muted, fontSize: 14, textAlign: "center", lineHeight: 22 },
});