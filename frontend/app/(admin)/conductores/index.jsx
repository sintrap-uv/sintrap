import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { useFocusEffect, useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAllDrivers, toggleDriverStatus } from "../../../services/driverService";
import Header from "../../../components/Header";
import theme from "../../../constants/theme";

const T = theme.lightMode;

export default function ConductoresScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  
  const [conductores, setConductores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);

  const handleBack = () => {
    if (returnTo === "perfil") {
      router.replace("/home?tab=perfil");
    } else {
      router.back();
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarConductores();
    }, [])
  );

  const cargarConductores = async (esRefresh = false) => {
    if (esRefresh) setRefrescando(true);
    else setCargando(true);
    setError(null);

    const { data, error: err } = await getAllDrivers();
    if (err) setError("No se pudo cargar la lista de conductores.");
    else setConductores(data ?? []);

    setCargando(false);
    setRefrescando(false);
  };

  const handleToggleEstado = (conductor) => {
    const accion = conductor.activo ? "desactivar" : "activar";
    Alert.alert(
      `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} conductor?`,
      `Vas a ${accion} a ${conductor.nombre}.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          style: conductor.activo ? "destructive" : "default",
          onPress: async () => {
            const { error: err } = await toggleDriverStatus(conductor.id, conductor.activo);
            if (err) {
              Alert.alert("Error", "No se pudo cambiar el estado.");
            } else {
              setConductores((prev) =>
                prev.map((c) =>
                  c.id === conductor.id ? { ...c, activo: !c.activo } : c
                )
              );
            }
          },
        },
      ]
    );
  };

  const handleEditar = (conductor) => {
    router.push({
      pathname: "/(admin)/conductores/gestion",
      params: {
        modo: "editar",
        conductorId: conductor.id,
        nombre: conductor.nombre,
        cedula: conductor.cedula,
        celular: conductor.celular,
        avatar_url: conductor.avatar_url ?? "",
        returnTo: returnTo, // Pasar el parámetro de retorno a la pantalla de gestión
      },
    });
  };

  const handleNuevo = () => {
    router.push({
      pathname: "/(admin)/conductores/gestion",
      params: { 
        modo: "nuevo",
        returnTo: returnTo, // Pasar el parámetro de retorno a la pantalla de gestión
      },
    });
  };

  const renderConductor = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.estadoIndicador, item.activo ? styles.activo : styles.inactivo]} />

      {item.avatar_url ? (
        <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={22} color={T.text.secondary} />
        </View>
      )}

      <View style={styles.cardInfo}>
        <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
        <Text style={styles.cardDetalle}>
          <Text style={styles.cardLabel}>CC: </Text>{item.cedula}
        </Text>
        {item.placa && (
          <Text style={styles.cardDetalle}>
            <Text style={styles.cardLabel}>Placa: </Text>{item.placa}
          </Text>
        )}
        <View style={[styles.badge, item.activo ? styles.badgeActivo : styles.badgeInactivo]}>
          <Text style={[styles.badgeTexto, item.activo ? styles.badgeTextoActivo : styles.badgeTextoInactivo]}>
            {item.activo ? "Activo" : "Inactivo"}
          </Text>
        </View>
      </View>

      <View style={styles.cardAcciones}>
        <TouchableOpacity
          style={styles.btnEditar}
          onPress={() => handleEditar(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={16} color={T.icon.active} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btnEstado, item.activo ? styles.btnDesactivar : styles.btnActivar]}
          onPress={() => handleToggleEstado(item)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={item.activo ? "close-circle-outline" : "checkmark-circle-outline"}
            size={16}
            color={item.activo ? "#DC2626" : "#16A34A"}
          />
          <Text style={[styles.btnEstadoTexto, item.activo ? styles.textoDesactivar : styles.textoActivar]}>
            {item.activo ? "Desactivar" : "Activar"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={T.icon.active} />
        <Text style={styles.textoEstado}>Cargando conductores...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Ionicons name="cloud-offline-outline" size={48} color={T.text.secondary} />
        <Text style={styles.textoError}>{error}</Text>
        <TouchableOpacity style={styles.btnReintentar} onPress={() => cargarConductores()}>
          <Text style={styles.btnReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <Header
        titulo="Conductores"
        subtitulo="Gestión de conductores del sistema"
        showBack={true}
        onBack={handleBack}
      />

      <FlatList
        data={conductores}
        keyExtractor={(item) => item.id}
        renderItem={renderConductor}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarConductores(true)}
            colors={[T.icon.active]}
          />
        }
        ListEmptyComponent={
          <View style={styles.centrado}>
            <Ionicons name="people-outline" size={52} color={T.text.secondary} />
            <Text style={styles.textoVacio}>No hay conductores registrados</Text>
            <Text style={styles.textoVacioSub}>Toca el botón + para agregar uno</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.fab} onPress={handleNuevo} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: T.background },
  lista: { paddingHorizontal: 16, paddingBottom: 100 },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  textoEstado: { fontSize: 14, color: T.text.secondary, marginTop: 8 },
  textoError: { fontSize: 15, color: "#DC2626", textAlign: "center" },
  textoVacio: { fontSize: 16, fontWeight: "600", color: T.text.primary },
  textoVacioSub: { fontSize: 13, color: T.text.secondary },
  btnReintentar: {
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  btnReintentarTexto: { color: "#fff", fontWeight: "600" },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.cards.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cards.border,
    marginBottom: 10,
    padding: 14,
    gap: 12,
  },
  estadoIndicador: { width: 4, height: "100%", borderRadius: 4, minHeight: 60 },
  activo: { backgroundColor: "#16A34A" },
  inactivo: { backgroundColor: "#9CA3AF" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.cards.border },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: T.background,
    borderWidth: 1,
    borderColor: T.cards.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1, gap: 3 },
  cardNombre: { fontSize: 15, fontWeight: "600", color: T.text.primary },
  cardDetalle: { fontSize: 13, color: T.text.secondary },
  cardLabel: { fontWeight: "600", color: T.text.primary },
  badge: { alignSelf: "flex-start", marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeActivo: { backgroundColor: "#DCFCE7" },
  badgeInactivo: { backgroundColor: "#F3F4F6" },
  badgeTexto: { fontSize: 11, fontWeight: "600" },
  badgeTextoActivo: { color: "#16A34A" },
  badgeTextoInactivo: { color: "#6B7280" },
  cardAcciones: { alignItems: "flex-end", gap: 8 },
  btnEditar: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: T.cards.background,
    borderWidth: 1,
    borderColor: T.icon.active,
    alignItems: "center",
    justifyContent: "center",
  },
  btnEstado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnDesactivar: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  btnActivar: { borderColor: "#16A34A", backgroundColor: "#F0FDF4" },
  btnEstadoTexto: { fontSize: 12, fontWeight: "600" },
  textoDesactivar: { color: "#DC2626" },
  textoActivar: { color: "#16A34A" },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.Button.primary.background,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: T.Button.primary.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
});