import { useState } from "react"
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { useNotificaciones } from "../../hooks/useNotificaciones"
import theme from "../../constants/theme"

const t = theme.lightMode

const ICONO_TIPO = {
  retraso_bus: { nombre: "time-outline", color: "#F59E0B" },
  info:        { nombre: "information-circle-outline", color: "#3B82F6" },
  alerta:      { nombre: "warning-outline", color: "#EF4444" },
}

export default function NotificacionesUsuario({ usuarioId }) {
  const router = useRouter()
  const { notificaciones, loading, noLeidas, marcarLeida, marcarTodas } =
    useNotificaciones(usuarioId)

  const renderItem = ({ item }) => {
    const icono = ICONO_TIPO[item.tipo] ?? ICONO_TIPO.info

    return (
      <TouchableOpacity
        style={[styles.card, !item.leida && styles.cardNoLeida]}
        onPress={() => marcarLeida(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconoBox, { backgroundColor: icono.color + "18" }]}>
          <Ionicons name={icono.nombre} size={22} color={icono.color} />
        </View>
        <View style={styles.contenido}>
          <View style={styles.tituloRow}>
            <Text style={styles.titulo}>{item.titulo}</Text>
            {!item.leida && <View style={styles.puntito} />}
          </View>
          <Text style={styles.mensaje}>{item.mensaje}</Text>
          <Text style={styles.fecha}>
            {new Date(item.fecha).toLocaleDateString("es-CO", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={t.Headers?.gradientColors ?? ["#16A34A", "#22C55E"]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitulo}>Notificaciones</Text>
          {noLeidas > 0 && (
            <Text style={styles.headerSub}>{noLeidas} sin leer</Text>
          )}
        </View>
        {noLeidas > 0 && (
          <TouchableOpacity onPress={marcarTodas}>
            <Text style={styles.marcarBtn}>Marcar todas</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Lista */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={t.icon?.active ?? "#16A34A"}
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.lista}
          ListEmptyComponent={
            <View style={styles.vacioCont}>
              <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
              <Text style={styles.vacio}>No tienes notificaciones</Text>
            </View>
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
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  marcarBtn: { fontSize: 13, color: "#fff", fontWeight: "600", textDecorationLine: "underline" },
  lista: { padding: 16, gap: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardNoLeida: {
    borderLeftWidth: 3,
    borderLeftColor: "#16A34A",
  },
  iconoBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  contenido: { flex: 1 },
  tituloRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  titulo: { fontSize: 14, fontWeight: "700", color: "#111827", flex: 1 },
  puntito: {
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
    marginLeft: 8,
  },
  mensaje: { fontSize: 13, color: "#4B5563", lineHeight: 18, marginBottom: 6 },
  fecha: { fontSize: 11, color: "#9CA3AF" },
  vacioCont: { alignItems: "center", marginTop: 60, gap: 12 },
  vacio: { fontSize: 14, color: "#9CA3AF" },
})