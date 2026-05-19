import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../services/supabase";
import { getProfile } from "../../services/profileService";
import ProfileCard from "../../components/ProfileCard";
import theme from "../../constants/theme";
import Header from "../../components/Header";
import {
  getDashboardConductor,
  actualizarEstadoTurno,
  formatearHora,
  nombreTurno,
} from "../../services/dashboardConductorService";
import { actualizarUbicacionUsuario } from "../../services/locationService";
import * as Location from "expo-location";

const T = theme.lightMode;

const TURNO_ESTADO_CONFIG = {
  programado: { color: "#3B82F6", bg: "#DBEAFE", label: "Programado" },
  en_curso:   { color: "#22C55E", bg: "#DCFCE7", label: "En curso"   },
  completado: { color: "#6B7280", bg: "#F3F4F6", label: "Completado" },
  cancelado:  { color: "#EF4444", bg: "#FEE2E2", label: "Cancelado"  },
};

// Función para obtener el color de la barra según el porcentaje
const getBarraColor = (porcentaje) => {
  if (porcentaje === 0) return "transparent";
  if (porcentaje >= 90) return "#EF4444";
  if (porcentaje >= 70) return "#F97316";
  return "#22C55E";
};

// ─── Chip de estado 
function ChipEstado({ estado }) {
  const cfg = TURNO_ESTADO_CONFIG[estado] ?? TURNO_ESTADO_CONFIG.programado;
  return (
    <View style={[styles.chip, { backgroundColor: cfg.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: cfg.color }]} />
      <Text style={[styles.chipTexto, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

// ─── Parada del recorrido
function ItemParadaConductor({ parada, esUltima }) {
  return (
    <View style={styles.paradaFila}>
      <View style={styles.paradaConector}>
        <View style={[styles.paradaPunto, { backgroundColor: "#D1D5DB" }]} />
        {!esUltima && <View style={[styles.paradaLinea, { backgroundColor: "#E5E7EB" }]} />}
      </View>

      <View style={styles.paradaContenido}>
        <View style={styles.paradaRow}>
          <Text style={styles.paradaNombre}>
            {parada.nombre}
          </Text>
        </View>

        <View style={styles.paradaMetadata}>
          {parada.eta > 0 && (
            <Text style={styles.paradaETA}>{parada.eta} min</Text>
          )}
          {parada.usuariosSuben > 0 && (
            <View style={styles.paradaUsuarios}>
              <MaterialCommunityIcons
                name="account-arrow-up"
                size={12}
                color="#6B7280"
              />
              <Text style={styles.paradaUsuariosTexto}>
                {parada.usuariosSuben} sube{parada.usuariosSuben > 1 ? "n" : ""}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Dashboard conductor 
export default function DashboardConductor() {
  const router = useRouter();

  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const [conductorId,   setConductorId]   = useState(null);
  const [datos,         setDatos]         = useState(null);
  const [sinTurno,      setSinTurno]      = useState(false);
  const [cargando,      setCargando]      = useState(true);
  const [refrescando,   setRefrescando]   = useState(false);
  const [actualizando,  setActualizando]  = useState(false);

  useEffect(() => {
    const cargarPerfil = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;
      setUserId(user.id);
      setUserEmail(user.email ?? "");
      const { data: perfilData } = await getProfile(user.id);
      if (perfilData) setPerfil(perfilData);
    };
    cargarPerfil();
  }, []);

  const handleGuardado = (actualizado) => {
    if (actualizado) setPerfil((prev) => ({ ...prev, ...actualizado }));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setConductorId(data.user.id);
    });
  }, []);

  const cargarDatos = useCallback(async (esRefresh = false) => {
    if (!conductorId) return;
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    try {
      const resultado = await getDashboardConductor(conductorId);
      if (resultado.success) {
        if (!resultado.data) setSinTurno(true);
        else { setDatos(resultado.data); setSinTurno(false); }
      } else {
        setSinTurno(true);
      }
    } catch (e) {
      console.error("Error dashboard conductor:", e.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [conductorId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  if (mostrarPerfil) {
    return (
      <ProfileCard
        name={perfil?.nombre ?? ""}
        email={userEmail}
        avatarUri={perfil?.avatar_url ?? null}
        role={perfil?.rol ?? "conductor"}
        isActive={perfil?.activo ?? true}
        loading={false}
        perfilInicial={perfil}
        userId={userId}
        onGuardado={handleGuardado}
        onTripHistory={() => {}}
        onNotifications={() => {}}
        onSettings={() => {}}
        onChangePassword={() => {}}
        onLogout={handleLogout}
        onMyVehicle={() => router.push("/(conductor)/mis-buses")}
        onAssignedRoutes={() => router.push("/(conductor)/DashboardConductor")}
        serviceActive={true}
        onToggleService={() => {}}
        onBack={() => setMostrarPerfil(false)}
      />
    );
  }

  const actualizarUbicacion = async () => {
    setActualizando(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Activa la ubicación para actualizar tu posición.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      await actualizarUbicacionUsuario(
        conductorId,
        loc.coords.latitude,
        loc.coords.longitude,
        null
      );
      Alert.alert("Ubicación actualizada", "Tu posición fue registrada correctamente.");
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setActualizando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.root}>
        <Header
          titulo="Mi turno"
          subtitulo="Panel del conductor"
          mode="light"
          iconoDerecha={
            <TouchableOpacity onPress={() => setMostrarPerfil(true)}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={styles.cargandoTexto}>Cargando tu turno...</Text>
        </View>
      </View>
    );
  }

  if (sinTurno) {
    return (
      <View style={styles.root}>
        <Header
          titulo="Mi turno"
          subtitulo="Panel del conductor"
          mode="light"
          iconoDerecha={
            <TouchableOpacity onPress={() => setMostrarPerfil(true)}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          }
        />
        <View style={styles.centrado}>
          <MaterialCommunityIcons name="calendar-blank" size={64} color="#D1D5DB" />
          <Text style={styles.sinTurnoTitulo}>Sin turno hoy</Text>
          <Text style={styles.sinTurnoSub}>
            No tienes ningún turno programado para el día de hoy. Contacta al administrador si crees que es un error.
          </Text>
          <TouchableOpacity
            style={styles.btnReportar}
            onPress={() => router.push("/(conductor)/EnviarNotificacion")}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#fff" />
            <Text style={styles.btnReportarTexto}>Reportar al administrador</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const { turno, ruta, vehiculo, paradas, totalPasajeros, historial } = datos;
  const capacidad = vehiculo?.capacidad ?? 0;
  const porcentaje = capacidad > 0 ? Math.round((totalPasajeros / capacidad) * 100) : 0;
  const barraColor = getBarraColor(porcentaje);
  const cuposDisponibles = capacidad - totalPasajeros;
  
  // Color del borde según el estado del turno
  const borderColor = turno.estado === "en_curso" ? "#22C55E" : "#3B82F6";

  return (
    <View style={styles.root}>
      <Header
        titulo="Mi turno"
        subtitulo={`Ruta ${ruta?.numeroRuta ?? ""} · ${nombreTurno(turno.nombreTurno)}`}
        mode="light"
        iconoDerecha={
          <TouchableOpacity onPress={() => setMostrarPerfil(true)}>
            <Ionicons name="settings-outline" size={24} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarDatos(true)}
            colors={[T.Button.primary.background]}
            tintColor={T.Button.primary.background}
          />
        }
      >
        <View style={[styles.heroCard, { borderLeftColor: borderColor }]}>
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>Turno {nombreTurno(turno.nombreTurno)}</Text>
              <Text style={styles.heroRuta} numberOfLines={1}>
                {ruta?.nombre}
              </Text>
            </View>
            <ChipEstado estado={turno.estado} />
          </View>

          <View style={styles.horarioRow}>
            <View style={styles.horarioDato}>
              <Ionicons name="time-outline" size={14} color={T.text.secondary} />
              <Text style={styles.horarioDatoTexto}>
                {formatearHora(turno.horaInicio)} → {formatearHora(turno.horaFin)}
              </Text>
            </View>
          </View>

          <View style={styles.busRow}>
            <View style={styles.busDato}>
              <MaterialCommunityIcons name="bus-side" size={16} color={T.text.secondary} />
              <Text style={styles.busDatoTexto}>{vehiculo?.placa}</Text>
            </View>
            <View style={styles.busDato}>
              <MaterialCommunityIcons name="seat-passenger" size={16} color={T.text.secondary} />
              <Text style={styles.busDatoTexto}>
                {vehiculo?.tipo} · {vehiculo?.capacidad} cupos
              </Text>
            </View>
          </View>

          <View>
            <View style={styles.ocupacionHeader}>
              <Text style={styles.ocupacionLabel}>Pasajeros asignados</Text>
              <Text style={styles.ocupacionContador}>
                {totalPasajeros}/{capacidad}
              </Text>
            </View>
            <View style={styles.barraFondo}>
              <View style={[
                styles.barraRelleno,
                {
                  width: `${porcentaje}%`,
                  backgroundColor: barraColor,
                },
              ]} />
            </View>
            <View style={styles.cuposDisponibles}>
              <Text style={styles.cuposDisponiblesTexto}>
                Cupos disponibles: {cuposDisponibles}
              </Text>
            </View>
            {porcentaje > 0 && (
              <Text style={[styles.porcentajeTexto, { color: barraColor === "transparent" ? "#22C55E" : barraColor, textAlign: 'right', marginTop: 4 }]}>
                {porcentaje}% ocupado
              </Text>
            )}
          </View>
        </View>

        <View style={styles.accionesRow}>
          <TouchableOpacity
            style={styles.accionCard}
            onPress={actualizarUbicacion}
            disabled={actualizando}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#DBEAFE" }]}>
              {actualizando
                ? <ActivityIndicator size="small" color="#3B82F6" />
                : <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#3B82F6" />
              }
            </View>
            <Text style={styles.accionTexto}>Actualizar{"\n"}ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accionCard}
            onPress={() => router.push("/(conductor)/EnviarNotificacion")}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#FEE2E2" }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#EF4444" />
            </View>
            <Text style={styles.accionTexto}>Reportar{"\n"}percance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accionCard}
            onPress={() => Alert.alert("En desarrollo", "Ruta alternativa estará disponible pronto")}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#FEF3C7" }]}>
              <MaterialCommunityIcons name="road-variant" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.accionTexto}>Ruta{"\n"}alternativa</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Recorrido de hoy</Text>
          <View style={styles.paradasCard}>
            {paradas.length > 0 ? (
              paradas.map((parada, i) => (
                <ItemParadaConductor
                  key={parada.id}
                  parada={parada}
                  esUltima={i === paradas.length - 1}
                />
              ))
            ) : (
              <Text style={styles.textoSinParadas}>No hay paradas configuradas para esta ruta</Text>
            )}
          </View>
        </View>

        {historial.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Turnos anteriores</Text>
            {historial.map((h, i) => {
              const duracionMin = h.horaInicioReal && h.horaFinReal
                ? Math.round((new Date(h.horaFinReal) - new Date(h.horaInicioReal)) / 60000)
                : null;
              return (
                <View key={i} style={styles.historialItem}>
                  <View style={[styles.historialEstado, { backgroundColor: "#F3F4F6" }]}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color="#6B7280"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historialFecha}>
                      {new Date(h.fecha).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                      {" · Ruta "}{h.numeroRuta}
                    </Text>
                    <Text style={styles.historialDetalle}>
                      {nombreTurno(h.nombreTurno)} · {h.placa}
                      {duracionMin ? ` · ${duracionMin} min` : ""}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: "#F3F4F6" }]}>
                    <Text style={[styles.chipTexto, { color: "#6B7280" }]}>Completado</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  contenido: { padding: 16, paddingBottom: 32, gap: 12 },

  centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  cargandoTexto: { fontSize: 14, color: T.text.secondary },
  sinTurnoTitulo: { fontSize: 18, fontWeight: "600", color: T.text.primary, textAlign: "center" },
  sinTurnoSub: { fontSize: 14, color: T.text.secondary, textAlign: "center", lineHeight: 20 },

  heroCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, borderLeftWidth: 4,
    gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  heroHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroLabel: { fontSize: 12, fontWeight: "600", color: T.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  heroRuta: { fontSize: 16, fontWeight: "700", color: T.text.primary, marginTop: 2 },

  horarioRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  horarioDato: { flexDirection: "row", alignItems: "center", gap: 5 },
  horarioDatoTexto: { fontSize: 13, color: T.text.secondary },

  busRow: { flexDirection: "row", gap: 16 },
  busDato: { flexDirection: "row", alignItems: "center", gap: 5 },
  busDatoTexto: { fontSize: 13, color: T.text.secondary },

  ocupacionHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  ocupacionLabel: { fontSize: 12, color: T.text.secondary },
  ocupacionContador: { fontSize: 12, fontWeight: "600", color: T.text.primary },
  barraFondo: { height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  barraRelleno: { height: 6, borderRadius: 3 },

  porcentajeTexto: {
    fontSize: 11,
    fontWeight: "600",
  },

  cuposDisponibles: {
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cuposDisponiblesTexto: {
    fontSize: 12,
    color: T.text.secondary,
    fontWeight: "500",
  },

  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTexto: { fontSize: 11, fontWeight: "600" },

  accionesRow: { flexDirection: "row", gap: 8 },
  accionCard: {
    flex: 1, alignItems: "center", backgroundColor: "#fff", borderRadius: 12,
    paddingVertical: 12, gap: 6,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  accionIcono: { width: 42, height: 42, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  accionTexto: { fontSize: 11, fontWeight: "500", color: T.text.primary, textAlign: "center", lineHeight: 15 },

  seccion: { gap: 10 },
  tituloSeccion: {
    fontSize: 13, fontWeight: "600", color: T.text.secondary,
    textTransform: "uppercase", letterSpacing: 0.8,
  },

  paradasCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  paradaFila: { flexDirection: "row", gap: 12, minHeight: 54 },
  paradaConector: { alignItems: "center", width: 16 },
  paradaPunto: { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  paradaLinea: { width: 2, flex: 1, marginTop: 4 },
  paradaContenido: { flex: 1, paddingBottom: 8 },
  paradaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  paradaNombre: { fontSize: 14, fontWeight: "500", color: T.text.primary },
  paradaMetadata: { flexDirection: "row", gap: 10, marginTop: 3 },
  paradaETA: { fontSize: 11, color: T.text.secondary },
  paradaUsuarios: { flexDirection: "row", alignItems: "center", gap: 3 },
  paradaUsuariosTexto: { fontSize: 11, color: T.text.secondary },
  textoSinParadas: { fontSize: 13, color: T.text.secondary, textAlign: "center", paddingVertical: 16 },

  historialItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  historialEstado: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  historialFecha: { fontSize: 13, fontWeight: "600", color: T.text.primary },
  historialDetalle: { fontSize: 11, color: T.text.secondary, marginTop: 2 },

  btnReportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EF4444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  btnReportarTexto: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});