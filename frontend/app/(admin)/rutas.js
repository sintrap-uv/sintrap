import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getOcupacionRutas } from "../../services/dashboardAdminService";
import theme from "../../constants/theme";

const T = theme.lightMode;

export default function TodasLasRutasScreen() {
  const router = useRouter();
  const [rutas, setRutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarRutas = async (esRefresh = false) => {
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    const { data } = await getOcupacionRutas();
    if (data) setRutas(data);

    setCargando(false);
    setRefrescando(false);
  };

  useFocusEffect(
    useCallback(() => {
      cargarRutas();
    }, [])
  );

  const renderRuta = ({ item: ruta }) => (
    <TouchableOpacity 
      style={styles.rutaCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/(admin)/asignar-recursos?id=${ruta.id}`)}
    >
      <View style={styles.rutaHeader}>
        <View style={styles.rutaInfo}>
          <View style={[styles.rutaDot, { backgroundColor: ruta.color || "#1B5E20" }]} />
          <Text style={styles.rutaNombre} numberOfLines={1}>
            Ruta {ruta.numero_ruta} · {ruta.nombre.split("—")[1]?.trim() ?? ruta.nombre}
          </Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {ruta.asignados}/{ruta.capacidad > 0 ? ruta.capacidad : "–"}
          </Text>
        </View>
      </View>
      
      <View style={styles.barraFondo}>
        <View 
          style={[
            styles.barraRelleno, 
            { 
              width: `${Math.min(ruta.porcentaje, 100)}%`,
              backgroundColor: ruta.porcentaje >= 90 ? "#EF4444" : ruta.porcentaje >= 70 ? "#F97316" : "#22C55E"
            }
          ]} 
        />
      </View>
      
      <View style={styles.rutaFooter}>
        <Text style={styles.rutaPorcentaje}>
          {ruta.capacidad > 0
            ? `${ruta.porcentaje}% ocupado · ${ruta.capacidad - ruta.asignados} cupos disponibles`
            : "Sin vehículo asignado"}
        </Text>
        <TouchableOpacity 
          style={styles.asignarBtn}
          onPress={() => router.push(`/(admin)/asignar-recursos?id=${ruta.id}`)}
        >
          <Ionicons name="bus-outline" size={14} color="#fff" />
          <Text style={styles.asignarBtnText}>Asignar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (cargando && !refrescando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={T.Button.primary.background} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Título como en el Dashboard */}
      <View style={styles.tituloContainer}>
        <Text style={styles.tituloPrincipal}>Todas las Rutas</Text>
        <Text style={styles.subtitulo}>{rutas.length} rutas activas</Text>
      </View>
      
      <FlatList
        data={rutas}
        keyExtractor={(item) => item.id}
        renderItem={renderRuta}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl 
            refreshing={refrescando} 
            onRefresh={() => cargarRutas(true)}
            colors={[T.Button.primary.background]}
            tintColor={T.Button.primary.background}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateText}>No hay rutas activas</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  tituloContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  tituloPrincipal: {
    fontSize: 22,
    fontWeight: "700",
    color: T.text.primary,
  },
  subtitulo: {
    fontSize: 13,
    color: T.text.secondary,
    marginTop: 4,
  },
  
  listContent: { padding: 16, paddingBottom: 32, gap: 12 },
  
  rutaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rutaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  rutaInfo: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rutaDot: { width: 12, height: 12, borderRadius: 6 },
  rutaNombre: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: T.text.primary, 
    flex: 1,
  },
  badge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text.secondary,
  },
  barraFondo: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  barraRelleno: { 
    height: 6, 
    borderRadius: 3,
  },
  rutaFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rutaPorcentaje: { 
    fontSize: 12, 
    color: T.text.secondary,
    flex: 1,
  },
  asignarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  asignarBtnText: { 
    color: "#fff", 
    fontSize: 13, 
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#9CA3AF",
    fontWeight: "500",
  },
});