 /**
 * vehiculos.jsx
 * Pantalla de gestión de vehículos — SINTRAP
 * Ruta: app/(admin)/vehiculos.jsx
 *
 * Columnas usadas: id, placa, seguro (bool), conductor_id (uuid → profiles), activo (bool)
 * NUNCA se toca la columna "capacidad".
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
  ScrollView,
  RefreshControl,
  TextInput,
} from "react-native";
import { supabase } from "../../services/supabase";
import theme from "../../constants/theme";

// ─── ALIAS DEL TEMA ───────────────────────────────────────────────────────────
const T = theme.lightMode;

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function VehiculosScreen() {
  const [vehiculos,       setVehiculos]       = useState([]);
  const [conductores,     setConductores]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [globalError,     setGlobalError]     = useState(null);
  const [busqueda,        setBusqueda]        = useState("");

  // Modal edición
  const [modalVisible,    setModalVisible]    = useState(false);
  const [editando,        setEditando]        = useState(null);
  const [formActivo,      setFormActivo]      = useState(true);
  const [formSeguro,      setFormSeguro]      = useState(false);
  const [formConductorId, setFormConductorId] = useState(null);
  const [guardando,       setGuardando]       = useState(false);

  // Modal confirmación borrado
  const [confirmVisible,  setConfirmVisible]  = useState(false);
  const [paraEliminar,    setParaEliminar]    = useState(null);
  const [eliminando,      setEliminando]      = useState(false);

  // ── FETCH VEHÍCULOS ──────────────────────────────────────────────────────
  const fetchVehiculos = useCallback(async () => {
    setGlobalError(null);
    try {
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

  useEffect(() => {
    fetchVehiculos();
    fetchConductores();
  }, [fetchVehiculos, fetchConductores]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVehiculos();
  };

  // ── FILTRO DE BÚSQUEDA ───────────────────────────────────────────────────
  const vehiculosFiltrados = vehiculos.filter((v) =>
    v.placa.toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.profiles?.nombre ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── ABRIR / CERRAR EDICIÓN ───────────────────────────────────────────────
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

  // ── UPDATE ───────────────────────────────────────────────────────────────
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
      setVehiculos(prev);
    } finally {
      setGuardando(false);
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
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

  // ── RENDER TARJETA ───────────────────────────────────────────────────────
  function renderVehiculo({ item: v }) {
    const nombreConductor = v.profiles?.nombre ?? "Sin conductor";
    return (
      <View style={s.card}>
        {/* Cabecera de la tarjeta */}
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            {/* Badge estado */}
            <View style={[s.badge, v.activo ? s.badgeActivo : s.badgeInactivo]}>
              <Text style={[s.badgeText, { color: v.activo ? "#16A34A" : T.text.secondary }]}>
                {v.activo ? "Activo" : "Inactivo"}
              </Text>
            </View>
          </View>

          {/* Botones acción */}
          <View style={s.cardActions}>
            <TouchableOpacity
              style={s.btnIconEdit}
              onPress={() => abrirEdicion(v)}
              activeOpacity={0.7}
            >
              <Text style={s.btnIconEditText}>✏</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.btnIconDel}
              onPress={() => pedirConfirmacion(v)}
              activeOpacity={0.7}
            >
              <Text style={s.btnIconDelText}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Placa */}
        <Text style={s.placa}>{v.placa}</Text>

        {/* Info */}
        <View style={s.cardInfo}>
          <View style={s.infoRow}>
            <Text style={s.infoIcon}>👤</Text>
            <Text style={s.infoValue}>{nombreConductor}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoIcon}>🛡</Text>
            <Text style={[s.infoValue, { color: v.seguro ? "#16A34A" : T.icon.error }]}>
              {v.seguro ? "Seguro vigente" : "Sin seguro"}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* Buscador */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
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
          <Text style={s.errorText}>⚠ {globalError}  (toca para cerrar)</Text>
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
          <Text style={s.emptyIcon}>🚌</Text>
          <Text style={s.emptyText}>
            {busqueda ? "Sin resultados para tu búsqueda" : "No hay vehículos registrados"}
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
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={cerrarEdicion}
      >
        <View style={s.overlay}>
          <View style={s.modalBox}>

            {/* Cabecera */}
            <View style={s.modalHead}>
              <Text style={s.modalTitle}>Editar Vehículo</Text>
              <TouchableOpacity onPress={cerrarEdicion} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>

              {/* Placa — solo lectura */}
              <Text style={s.fieldLabel}>Placa</Text>
              <View style={s.fieldReadonly}>
                <Text style={s.fieldReadonlyText}>{editando?.placa}</Text>
              </View>
              <Text style={s.fieldHint}>La placa no se edita en este módulo.</Text>

              {/* Switch: Activo */}
              <View style={s.switchRow}>
                <View>
                  <Text style={s.fieldLabel}>Estado del vehículo</Text>
                  <Text style={s.fieldHint}>
                    {formActivo ? "Activo en servicio" : "Fuera de servicio"}
                  </Text>
                </View>
                <Switch
                  value={formActivo}
                  onValueChange={setFormActivo}
                  trackColor={{ false: T.cards.border, true: "#BBF7D0" }}
                  thumbColor={formActivo ? T.Headers.innerColor : T.text.secondary}
                />
              </View>

              {/* Switch: Seguro */}
              <View style={s.switchRow}>
                <View>
                  <Text style={s.fieldLabel}>Seguro</Text>
                  <Text style={s.fieldHint}>
                    {formSeguro ? "Seguro vigente" : "Sin seguro activo"}
                  </Text>
                </View>
                <Switch
                  value={formSeguro}
                  onValueChange={setFormSeguro}
                  trackColor={{ false: T.cards.border, true: "#BBF7D0" }}
                  thumbColor={formSeguro ? T.Headers.innerColor : T.text.secondary}
                />
              </View>

              {/* Selector de conductor */}
              <Text style={[s.fieldLabel, { marginTop: 20 }]}>Conductor asignado</Text>
              {conductores.length === 0 ? (
                <Text style={s.fieldHint}>No se pudieron cargar conductores.</Text>
              ) : (
                <ScrollView
                  style={s.conductorList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {/* Sin conductor */}
                  <TouchableOpacity
                    style={[s.conductorItem, formConductorId === null && s.conductorSelected]}
                    onPress={() => setFormConductorId(null)}
                  >
                    <Text style={[s.conductorName, formConductorId === null && s.conductorNameSelected]}>
                      Sin conductor asignado
                    </Text>
                    {formConductorId === null && (
                      <Text style={s.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>

                  {conductores.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[s.conductorItem, formConductorId === c.id && s.conductorSelected]}
                      onPress={() => setFormConductorId(c.id)}
                    >
                      <Text style={[s.conductorName, formConductorId === c.id && s.conductorNameSelected]}>
                        {c.nombre}
                      </Text>
                      {formConductorId === c.id && (
                        <Text style={s.checkmark}>✓</Text>
                      )}
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
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnSaveText}>Guardar cambios</Text>
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
          <View style={[s.modalBox, { maxHeight: 300 }]}>
            <View style={s.modalHead}>
              <Text style={[s.modalTitle, { color: T.icon.error }]}>Eliminar vehículo</Text>
              <TouchableOpacity onPress={() => setConfirmVisible(false)}>
                <Text style={s.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={s.confirmBody}>
              <Text style={s.confirmIcon}>🗑️</Text>
              <Text style={s.confirmText}>
                ¿Eliminar el vehículo{" "}
                <Text style={{ color: T.Headers.innerColor, fontWeight: "700" }}>
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
                style={[s.btnSave, { backgroundColor: T.icon.error }]}
                onPress={handleEliminar}
                disabled={eliminando}
              >
                {eliminando
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnSaveText}>Sí, eliminar</Text>
                }
              </TouchableOpacity>
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
  searchIcon:  { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: T.input.text },

  // Error
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 12,
  },
  errorText:   { color: T.icon.error, fontSize: 13 },

  // Loading / empty
  centered:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { color: T.text.secondary, fontSize: 14 },
  emptyIcon:   { fontSize: 40 },
  emptyText:   { color: T.text.secondary, fontSize: 14 },

  // Lista
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12, paddingTop: 8 },

  // Tarjeta
  card: {
    backgroundColor: T.cards.background,
    borderRadius: T.cards.borderRadius,
    borderWidth: 1, borderColor: T.cards.border,
    padding: 16, gap: 10,
    ...theme.shadows?.card,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardActions:    { flexDirection: "row", gap: 8 },

  // Placa
  placa: { fontSize: 20, fontWeight: "800", color: T.text.primary, letterSpacing: 1 },

  // Badges
  badge:        { borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  badgeActivo:  { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeInactivo:{ backgroundColor: "#F1F5F9", borderColor: T.cards.border },
  badgeText:    { fontSize: 11, fontWeight: "600" },

  // Info rows
  cardInfo:  { gap: 6 },
  infoRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  infoIcon:  { fontSize: 13 },
  infoValue: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },

  // Botones icono
  btnIconEdit: {
    backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC",
    borderRadius: 8, width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
  },
  btnIconEditText: { fontSize: 14 },
  btnIconDel: {
    backgroundColor: "#FEF2F2", borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 8, width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
  },
  btnIconDelText: { fontSize: 14 },

  // Modal
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox:   {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: T.cards.border,
    maxHeight: "88%", paddingBottom: 24,
  },
  modalHead:  {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 20, borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: T.text.primary },
  modalClose: { fontSize: 20, color: T.text.secondary, fontWeight: "600" },
  modalBody:  { padding: 20 },
  modalFoot:  {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 20, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: T.cards.border,
  },

  // Campos
  fieldLabel:        { fontSize: 11, fontWeight: "700", color: T.text.secondary, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6, marginTop: 16 },
  fieldHint:         { fontSize: 11, color: T.text.tertiary, marginTop: 3 },
  fieldReadonly:     { backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: T.input.border, borderRadius: T.input.borderRadius, paddingHorizontal: 14, paddingVertical: 12 },
  fieldReadonlyText: { color: T.text.primary, fontWeight: "700", fontSize: 15, letterSpacing: 1 },

  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: T.cards.border,
  },

  // Selector conductor
  conductorList:        { maxHeight: 180, borderWidth: 1, borderColor: T.cards.border, borderRadius: 12, marginTop: 6, marginBottom: 8 },
  conductorItem:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: T.cards.border },
  conductorSelected:    { backgroundColor: "#F0FDF4" },
  conductorName:        { fontSize: 14, color: T.text.primary },
  conductorNameSelected:{ color: T.Headers.innerColor, fontWeight: "700" },
  checkmark:            { color: T.Headers.innerColor, fontSize: 16, fontWeight: "700" },

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
  confirmBody: { alignItems: "center", padding: 24, gap: 12 },
  confirmIcon: { fontSize: 36 },
  confirmText: { color: T.text.secondary, fontSize: 14, textAlign: "center", lineHeight: 22 },
});