import { useState, useEffect } from "react"
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, TextInput, ActivityIndicator
} from "react-native"
import { Ionicons, MaterialIcons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { supabase } from "../../services/supabase"
import { useNotificaciones } from "../../hooks/useNotificaciones"
import theme from "../../constants/theme"

const t = theme.lightMode

export default function NotificacionesAdmin({ usuarioId, onVolver }) {
  const router = useRouter()
  const { notificaciones, loading, marcarLeida } = useNotificaciones(usuarioId)
  const [busqueda, setBusqueda] = useState("")

  const handleAprobar = async (notif) => {
    await marcarLeida(notif.id)
  }

  const handleRechazar = async (notif) => {
    await supabase
      .from("notificaciones")
      .update({ leida: true, metadata: { ...notif.metadata, rechazada: true } })
      .eq("id", notif.id)
    await marcarLeida(notif.id)
  }

  const notifFiltradas = notificaciones.filter((n) => {
    const nombre = n.metadata?.conductor_nombre ?? ""
    return nombre.toLowerCase().includes(busqueda.toLowerCase())
  })

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {/* Info del conductor */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={22} color="#6B7280" />
        </View>
        <View style={styles.conductorInfo}>
          <Text style={styles.conductorNombre}>
            {item.usuario_id?.nombre ?? "Conductor"}
          </Text>
          <Text style={styles.conductorDato}>
            {item.usuario_id?.cedula ?? "—"}
          </Text>
          <View style={styles.telefonoRow}>
            <Ionicons name="call-outline" size={13} color="#6B7280" />
            <Text style={styles.conductorDato}>
              {" "}{item.usuario_id?.telefono ?? "—"}
            </Text>
          </View>
        </View>
        {item.metadata?.urgente && (
          <View style={styles.urgenteBadge}>
            <Text style={styles.urgenteTexto}>Urgente</Text>
          </View>
        )}
      </View>

      {/* Mensaje */}
      <View style={styles.mensajeBox}>
        {item.tipo === "retraso_bus" && (
          <MaterialIcons name="warning" size={18} color="#EF4444" style={{ marginRight: 8 }} />
        )}
        <Text style={styles.mensajeTexto}>{item.mensaje}</Text>
      </View>

      {/* Acciones — solo si no está leída */}
      {!item.leida && (
        <View style={styles.accionesRow}>
          <TouchableOpacity onPress={() => handleAprobar(item)} style={styles.accionBtn}>
            <Ionicons name="checkmark" size={20} color="#16A34A" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleRechazar(item)} style={styles.accionBtn}>
            <Ionicons name="close" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={t.Headers?.gradientColors ?? ["#16A34A", "#22C55E"]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => onVolver()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitulo}>Tus notificaciones</Text>
          <Text style={styles.headerSub}>Gestión de personal</Text>
        </View>
      </LinearGradient>

      {/* Buscador */}
      <View style={styles.buscadorWrapper}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.buscador}
          placeholder="Buscar conductor"
          placeholderTextColor="#9CA3AF"
          value={busqueda}
          onChangeText={setBusqueda}
        />
      </View>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator size="large" color={t.icon?.active ?? "#16A34A"} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifFiltradas}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <Text style={styles.vacio}>No hay notificaciones pendientes</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  buscadorWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  buscador: { flex: 1, marginLeft: 8, fontSize: 15, color: "#111" },
  lista: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  conductorInfo: { flex: 1 },
  conductorNombre: { fontSize: 15, fontWeight: "700", color: "#111827" },
  conductorDato: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  telefonoRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  urgenteBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  urgenteTexto: { color: "#fff", fontSize: 12, fontWeight: "700" },
  mensajeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  mensajeTexto: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
  accionesRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
  },
  accionBtn: { padding: 4 },
  vacio: { textAlign: "center", color: "#9CA3AF", marginTop: 40, fontSize: 14 },
})