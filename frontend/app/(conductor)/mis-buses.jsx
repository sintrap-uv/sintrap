 /**
 * mis-buses.jsx
 * Pantalla: Buses asignados al conductor — SINTRAP
 * Ruta: app/(conductor)/mis-buses.jsx
 *
 * Historia de Usuario:
 * "Como conductor quiero ver el listado de buses que tengo asignados"
 *
 * - Solo lectura: sin editar ni eliminar
 * - Filtra por conductor_id = usuario actual
 * - Muestra: placa, tipo, seguro, fechas SOAT, estado
 * - NUNCA toca la columna "capacidad"
 */

import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { getCurrentUser } from "../../services/auth";
import theme from "../../constants/theme";

const T = theme.lightMode;

export default function MisBusesScreen() {
  const [buses,      setBuses]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);

  // ── FETCH BUSES DEL CONDUCTOR ACTUAL ────────────────────────────────────
  const fetchMisBuses = useCallback(async () => {
    setError(null);
    try {
      // 1. Obtener usuario autenticado
      const { data: authData } = await getCurrentUser();
      const userId = authData?.user?.id;
      if (!userId) throw new Error("No se pudo identificar al conductor.");

      // 2. Buscar vehículos asignados al conductor
      // IMPORTANTE: no se selecciona "capacidad"
      const { data, error: dbError } = await supabase
        .from("vehiculos")
        .select(`
          id,
          placa,
          seguro,
          activo,
          fecha_inicio,
          fecha_vencimiento,
          tipo_vehiculo_id,
          tipo_vehiculo ( id, nombre, capacidad_max )
        `)
        .eq("conductor_id", userId)
        .order("placa", { ascending: true });

      if (dbError) throw dbError;
      setBuses(data || []);
    } catch (err) {
      setError(`Error de conexión: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMisBuses();
  }, [fetchMisBuses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMisBuses();
  };

  // ── RENDER TARJETA ───────────────────────────────────────────────────────
  function renderBus({ item: bus }) {
    return (
      <View style={s.card}>

        {/* Placa + badge activo */}
        <View style={s.cardHeader}>
          <Text style={s.placa}>{bus.placa}</Text>
          <View style={[s.badge, bus.activo ? s.badgeActivo : s.badgeInactivo]}>
            <Text style={[s.badgeText, { color: bus.activo ? "#16A34A" : T.text.secondary }]}>
              {bus.activo ? "Activo" : "Inactivo"}
            </Text>
          </View>
        </View>

        <View style={s.divider} />

         {/* Tipo de vehículo */}
<View style={s.infoRow}>
  <View style={[s.iconCircle, { backgroundColor: "#EFF6FF" }]}>
    <Ionicons name="car-outline" size={18} color="#3B82F6" />
  </View>
  <View>
    <Text style={s.infoLabel}>Tipo de vehículo</Text>
    <Text style={s.infoValue}>
      {bus.tipo_vehiculo?.nombre ?? "Sin tipo asignado"}
    </Text>
  </View>
</View>

{/* Capacidad — agrega esto aquí */}
<View style={s.infoRow}>
  <View style={[s.iconCircle, { backgroundColor: "#F5F3FF" }]}>
    <Ionicons name="people-outline" size={18} color="#8B5CF6" />
  </View>
  <View>
    <Text style={s.infoLabel}>Capacidad máxima</Text>
    <Text style={s.infoValue}>
      {bus.tipo_vehiculo?.capacidad_max ?? "—"} pasajeros
    </Text>
  </View>
</View>

        {/* Seguro */}
        <View style={s.infoRow}>
          <View style={[s.iconCircle, { backgroundColor: bus.seguro ? "#DCFCE7" : "#FEF2F2" }]}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={bus.seguro ? "#16A34A" : T.icon.error}
            />
          </View>
          <View>
            <Text style={s.infoLabel}>Seguro (SOAT)</Text>
            <Text style={[s.infoValue, { color: bus.seguro ? "#16A34A" : T.icon.error }]}>
              {bus.seguro ? "Vigente" : "Sin seguro activo"}
            </Text>
          </View>
        </View>

        {/* Fechas SOAT — solo si tiene seguro */}
        {bus.seguro && (
          <>
            <View style={s.infoRow}>
              <View style={[s.iconCircle, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="calendar-outline" size={18} color="#16A34A" />
              </View>
              <View>
                <Text style={s.infoLabel}>Inicio SOAT</Text>
                <Text style={s.infoValue}>{bus.fecha_inicio ?? "No registrada"}</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <View style={[s.iconCircle, { backgroundColor: "#FFF7ED" }]}>
                <Ionicons name="calendar-clear-outline" size={18} color="#F97316" />
              </View>
              <View>
                <Text style={s.infoLabel}>Vencimiento SOAT</Text>
                <Text style={s.infoValue}>{bus.fecha_vencimiento ?? "No registrada"}</Text>
              </View>
            </View>
          </>
        )}

        {/* Estado operativo */}
        <View style={s.infoRow}>
          <View style={[s.iconCircle, { backgroundColor: bus.activo ? "#DCFCE7" : "#F1F5F9" }]}>
            <Ionicons
              name="bus-outline"
              size={18}
              color={bus.activo ? "#16A34A" : T.text.secondary}
            />
          </View>
          <View>
            <Text style={s.infoLabel}>Estado del vehículo</Text>
            <Text style={[s.infoValue, { color: bus.activo ? "#16A34A" : T.text.secondary }]}>
              {bus.activo ? "Disponible para operar" : "Fuera de servicio"}
            </Text>
          </View>
        </View>

      </View>
    );
  }

  // ── RENDER PRINCIPAL ─────────────────────────────────────────────────────
  return (
    <View style={s.container}>

      {/* Error de conexión */}
      {error && (
        <TouchableOpacity style={s.errorBanner} onPress={() => setError(null)}>
          <Ionicons name="warning-outline" size={14} color={T.icon.error} style={{ marginRight: 6 }} />
          <Text style={s.errorText}>{error}  (toca para cerrar)</Text>
        </TouchableOpacity>
      )}

      {/* Cargando */}
      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={T.Headers.innerColor} />
          <Text style={s.loadingText}>Cargando tus buses…</Text>
        </View>

      /* Sin buses */
      ) : buses.length === 0 ? (
        <View style={s.centered}>
          <Ionicons name="bus-outline" size={48} color={T.cards.border} />
          <Text style={s.emptyTitle}>Sin buses asignados</Text>
          <Text style={s.emptySubtitle}>
            Aún no tienes vehículos asignados a tu perfil.{"\n"}
            Contacta al administrador.
          </Text>
        </View>

      /* Lista */
      ) : (
        <FlatList
          data={buses}
          keyExtractor={(b) => String(b.id)}
          renderItem={renderBus}
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
          ListHeaderComponent={
            <Text style={s.listHeader}>
              {buses.length} bus{buses.length !== 1 ? "es" : ""} asignado{buses.length !== 1 ? "s" : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },

  // Error
  errorBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.25)",
    margin: 16, borderRadius: 12, padding: 12,
  },
  errorText: { color: T.icon.error, fontSize: 13, flex: 1 },

  // Loading / empty
  centered:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  loadingText:   { color: T.text.secondary, fontSize: 14, marginTop: 8 },
  emptyTitle:    { fontSize: 17, fontWeight: "700", color: T.text.primary, textAlign: "center" },
  emptySubtitle: { fontSize: 13, color: T.text.secondary, textAlign: "center", lineHeight: 20, marginTop: 4 },

  // Lista
  list:       { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 8, gap: 12 },
  listHeader: { fontSize: 12, color: T.text.secondary, fontWeight: "600", marginBottom: 4, marginTop: 8 },

  // Tarjeta
  card: {
    backgroundColor: T.cards.background,
    borderRadius: T.cards.borderRadius,
    borderWidth: 1, borderColor: T.cards.border,
    padding: 16, gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },

  // Header tarjeta
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  placa:      { fontSize: 22, fontWeight: "800", color: T.text.primary, letterSpacing: 1 },

  // Badges
  badge:         { borderRadius: 100, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  badgeActivo:   { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" },
  badgeInactivo: { backgroundColor: "#F1F5F9", borderColor: T.cards.border },
  badgeText:     { fontSize: 12, fontWeight: "600" },

  // Divisor
  divider: { height: 1, backgroundColor: T.cards.border },

  // Info rows
  infoRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  iconCircle:{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: 11, color: T.text.tertiary, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: "600", color: T.text.primary, marginTop: 1 },
});