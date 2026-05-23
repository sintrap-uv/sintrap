import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { getCurrentUser } from "../../services/auth";
import { getTurnosConductor } from "../../services/dashboardConductorService";
import Header from "../../components/Header";
import theme from "../../constants/theme";

const T = theme.lightMode;

const ESTADO_CONFIG = {
  programado: { color: "#3B82F6", bg: "#DBEAFE", label: "Programado" },
  en_curso: { color: "#22C55E", bg: "#DCFCE7", label: "En curso" },
  completado: { color: "#6B7280", bg: "#F3F4F6", label: "Completado" },
  cancelado: { color: "#EF4444", bg: "#FEE2E2", label: "Cancelado" },
};

const FILTROS = [
  { key: "todos", label: "Todos", icon: "apps-outline" },
  { key: "programado", label: "Programados", icon: "calendar-outline" },
  { key: "en_curso", label: "En curso", icon: "play-circle-outline" },
  { key: "completado", label: "Completados", icon: "checkmark-circle-outline" },
  { key: "cancelado", label: "Cancelados", icon: "close-circle-outline" },
];

function ChipEstado({ estado }) {
  const cfg = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.programado;
  return (
    <View style={[styles.estadoChip, { backgroundColor: cfg.bg }]}>
      <View style={[styles.estadoDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.estadoTexto, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function TarjetaTurno({ turno }) {
  const fecha = new Date(turno.fecha);
  const fechaFormateada = fecha.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <View style={styles.tarjeta}>
      <View style={styles.tarjetaHeader}>
        <View style={styles.rutaInfo}>
          <Text style={styles.rutaNumero}>Ruta {turno.numero_ruta}</Text>
          <Text style={styles.rutaNombre} numberOfLines={1}>
            {turno.ruta_nombre}
          </Text>
        </View>
        <ChipEstado estado={turno.estado} />
      </View>

      <View style={styles.tarjetaBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={16} color={T.text.secondary} />
          <Text style={styles.infoText}>{fechaFormateada}</Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color={T.text.secondary} />
          <Text style={styles.infoText}>
            {turno.hora_inicio.slice(0, 5)} - {turno.hora_fin.slice(0, 5)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="bus-side" size={16} color={T.text.secondary} />
          <Text style={styles.infoText}>
            {turno.placa} · {turno.vehiculo_tipo} ({turno.capacidad} cupos)
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="people-outline" size={16} color={T.text.secondary} />
          <Text style={styles.infoText}>
            {turno.cantidad_pasajeros} pasajero{turno.cantidad_pasajeros !== 1 ? "s" : ""} asignados
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function MisTurnos() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  const vieneDelPerfil = returnTo === "perfil";

  const [turnos, setTurnos] = useState([]);
  const [turnosFiltrados, setTurnosFiltrados] = useState([]);
  const [filtroActivo, setFiltroActivo] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [error, setError] = useState(null);
  const [conductorId, setConductorId] = useState(null);

  useEffect(() => {
    const obtenerConductor = async () => {
      const { data } = await getCurrentUser();
      if (data?.user) {
        setConductorId(data.user.id);
      }
    };
    obtenerConductor();
  }, []);

  const cargarTurnos = useCallback(async (esRefresh = false) => {
    if (!conductorId) return;
    if (esRefresh) setRefrescando(true);
    else setCargando(true);
    setError(null);

    try {
      const response = await getTurnosConductor(conductorId);
      
      if (response.success && response.data) {
        setTurnos(response.data);
        aplicarFiltro(response.data, filtroActivo);
      } else {
        setError(response.error || "Error al cargar los turnos");
        setTurnos([]);
        setTurnosFiltrados([]);
      }
    } catch (err) {
      setError(err.message || "Error inesperado");
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [conductorId, filtroActivo]);

  const aplicarFiltro = (lista, filtro) => {
    if (filtro === "todos") {
      setTurnosFiltrados(lista);
    } else {
      setTurnosFiltrados(lista.filter(t => t.estado === filtro));
    }
  };

  const cambiarFiltro = (filtro) => {
    setFiltroActivo(filtro);
    aplicarFiltro(turnos, filtro);
  };

  useEffect(() => {
    if (conductorId) {
      cargarTurnos();
    }
  }, [conductorId, cargarTurnos]);

  const handleBack = () => {
    if (vieneDelPerfil) {
      router.replace("/home?tab=perfil");
    } else {
      router.replace("/home?tab=inicio");
    }
  };

  const handleGoToProfile = () => {
    router.push("/home?tab=perfil");
  };

  const renderFiltros = () => (
    <View style={styles.filtrosContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtrosContent}
      >
        {FILTROS.map((filtro) => (
          <TouchableOpacity
            key={filtro.key}
            style={[
              styles.filtroBtn,
              filtroActivo === filtro.key && styles.filtroBtnActivo,
            ]}
            onPress={() => cambiarFiltro(filtro.key)}
          >
            <Ionicons
              name={filtro.icon}
              size={18}
              color={filtroActivo === filtro.key ? "#fff" : T.text.secondary}
            />
            <Text
              style={[
                styles.filtroTexto,
                filtroActivo === filtro.key && styles.filtroTextoActivo,
              ]}
            >
              {filtro.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (cargando && !refrescando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={T.Button.primary.background} />
        <Text style={styles.cargandoTexto}>Cargando turnos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        titulo="Mis Turnos"
        subtitulo={`${turnosFiltrados.length} turno${turnosFiltrados.length !== 1 ? "s" : ""} encontrado${turnosFiltrados.length !== 1 ? "s" : ""}`}
        mode="light"
        showBack={vieneDelPerfil}
        onBack={handleBack}
        iconoDerecha={!vieneDelPerfil ? (
          <TouchableOpacity onPress={handleGoToProfile}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        ) : null}
      />

      {renderFiltros()}

      {error ? (
        <View style={styles.centrado}>
          <Ionicons name="alert-circle-outline" size={48} color={T.icon.error} />
          <Text style={styles.errorTexto}>{error}</Text>
          <TouchableOpacity style={styles.reintentarBtn} onPress={() => cargarTurnos()}>
            <Text style={styles.reintentarTexto}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : turnosFiltrados.length === 0 ? (
        <View style={styles.centrado}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color={T.text.secondary} />
          <Text style={styles.vacioTitulo}>No hay turnos</Text>
          <Text style={styles.vacioSubtexto}>
            {filtroActivo === "todos"
              ? "No tienes turnos asignados"
              : `No hay turnos en estado "${filtroActivo}"`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={turnosFiltrados}
          keyExtractor={(item) => item.turno_id.toString()}
          renderItem={({ item }) => <TarjetaTurno turno={item} />}
          contentContainerStyle={styles.lista}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refrescando}
              onRefresh={() => cargarTurnos(true)}
              colors={[T.Button.primary.background]}
              tintColor={T.Button.primary.background}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  cargandoTexto: { fontSize: 14, color: T.text.secondary },
  errorTexto: { fontSize: 14, color: T.icon.error, textAlign: "center" },
  reintentarBtn: {
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  reintentarTexto: { color: "#fff", fontWeight: "600" },
  vacioTitulo: { fontSize: 18, fontWeight: "600", color: T.text.primary, textAlign: "center" },
  vacioSubtexto: { fontSize: 14, color: T.text.secondary, textAlign: "center", marginTop: 4 },

  filtrosContainer: {
    backgroundColor: T.background,
  },
  filtrosContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  filtroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: T.cards.border,
  },
  filtroBtnActivo: {
    backgroundColor: T.Button.primary.background,
    borderColor: T.Button.primary.background,
  },
  filtroTexto: {
    fontSize: 13,
    color: T.text.secondary,
    fontWeight: "500",
  },
  filtroTextoActivo: {
    color: "#fff",
  },

  lista: { padding: 16, gap: 12, paddingBottom: 32 },

  tarjeta: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: T.cards.border,
  },
  tarjetaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rutaInfo: { flex: 1, marginRight: 12 },
  rutaNumero: { fontSize: 12, fontWeight: "600", color: T.text.secondary, textTransform: "uppercase" },
  rutaNombre: { fontSize: 15, fontWeight: "700", color: T.text.primary, marginTop: 2 },
  tarjetaBody: { gap: 8 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoText: { fontSize: 13, color: T.text.secondary, flex: 1 },

  estadoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  estadoDot: { width: 6, height: 6, borderRadius: 3 },
  estadoTexto: { fontSize: 11, fontWeight: "600" },
});