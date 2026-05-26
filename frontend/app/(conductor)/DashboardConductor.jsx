import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Location from "expo-location";
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
  actualizarUbicacionConductor,
} from "../../services/dashboardConductorService";

const T = theme.lightMode;

const TURNO_ESTADO_CONFIG = {
  programado: { color: "#3B82F6", bg: "#DBEAFE", label: "Programado" },
  en_curso: { color: "#22C55E", bg: "#DCFCE7", label: "En curso" },
  completado: { color: "#6B7280", bg: "#F3F4F6", label: "Completado" },
  cancelado: { color: "#EF4444", bg: "#FEE2E2", label: "Cancelado" },
};

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

// ─── Modal para cambiar estado del turno
function ModalCambiarEstado({ visible, estadoActual, onClose, onConfirm, loading }) {
  const estados = [
    { id: "programado", label: "Programado", color: "#3B82F6" },
    { id: "en_curso", label: "En curso", color: "#22C55E" },
    { id: "completado", label: "Completado", color: "#6B7280" },
    { id: "cancelado", label: "Cancelado", color: "#EF4444" },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Cambiar estado del turno</Text>
            <TouchableOpacity onPress={onClose} disabled={loading}>
              <Ionicons name="close" size={24} color={T.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalEstados}>
            {estados.map((est) => (
              <TouchableOpacity
                key={est.id}
                style={[
                  styles.estadoOption,
                  estadoActual === est.id && styles.estadoOptionActive,
                  { borderLeftColor: est.color },
                ]}
                onPress={() => onConfirm(est.id)}
                disabled={loading || estadoActual === est.id}
                activeOpacity={0.7}
              >
                <View style={[styles.estadoDot, { backgroundColor: est.color }]} />
                <Text
                  style={[
                    styles.estadoLabel,
                    estadoActual === est.id && styles.estadoLabelActive,
                  ]}
                >
                  {est.label}
                </Text>
                {estadoActual === est.id && (
                  <Ionicons name="checkmark-circle" size={20} color={est.color} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {loading && (
            <View style={styles.modalLoading}>
              <ActivityIndicator size="small" color={T.Button.primary.background} />
              <Text style={{ color: T.text.secondary, marginLeft: 8 }}>
                Actualizando...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Parada del recorrido con progreso
function ItemParadaConductor({ parada, esUltima, esPasada, esActual }) {
  const dotColor = esActual ? "#F59E0B" : esPasada ? "#9CA3AF" : "#D1D5DB";
  const dotSize = esActual ? 14 : 12;

  return (
    <View style={styles.paradaFila}>
      <View style={styles.paradaConector}>
        <View
          style={[
            styles.paradaPunto,
            {
              backgroundColor: dotColor,
              width: dotSize,
              height: dotSize,
            },
          ]}
        />
        {!esUltima && (
          <View
            style={[
              styles.paradaLinea,
              {
                backgroundColor: esActual || !esPasada ? "#E5E7EB" : "#D1D5DB",
              },
            ]}
          />
        )}
      </View>

      <View style={styles.paradaContenido}>
        <View style={styles.paradaRow}>
          <Text
            style={[styles.paradaNombre, esPasada && styles.paradaPasada]}
            numberOfLines={2}
          >
            {esPasada && "✓ "}
            {parada.nombre}
          </Text>
          {esActual && (
            <View style={styles.badgeActual}>
              <Text style={styles.badgeActualText}>Aquí</Text>
            </View>
          )}
        </View>

        <View style={styles.paradaMetadata}>
          {parada.usuariosSuben > 0 && (
            <Text style={styles.paradaUsuarios}>
              {parada.usuariosSuben} usuario{parada.usuariosSuben > 1 ? "s" : ""}
            </Text>
          )}
          {parada.eta != null && (
            <Text style={styles.paradaETA}>
              {esActual || esPasada ? "Pasó" : `ETA ${parada.eta} min`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Dashboard conductor
export default function DashboardConductor() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  const vieneDelPerfil = returnTo === "perfil";

  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  const [conductorId, setConductorId] = useState(null);
  const [datos, setDatos] = useState(null);
  const [sinTurno, setSinTurno] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [actualizandoUbicacion, setActualizandoUbicacion] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const [modalEstadoVisible, setModalEstadoVisible] = useState(false);

  const timerUbicacionRef = useRef(null);

  // ─── Navegación
  const handleBack = () => {
    if (vieneDelPerfil) {
      router.replace("/home?tab=perfil");
    } else {
      router.back();
    }
  };

  // ─── Carga inicial
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

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setConductorId(data.user.id);
    });
  }, []);

  // ─── Carga de datos del dashboard
  const cargarDatos = useCallback(async (esRefresh = false) => {
    if (!conductorId) return;
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    try {
      const resultado = await getDashboardConductor(conductorId);
      if (resultado.success) {
        if (!resultado.data) setSinTurno(true);
        else {
          setDatos(resultado.data);
          setSinTurno(false);
        }
      } else {
        setSinTurno(true);
      }
    } catch (e) {
      console.error("Error dashboard conductor:", e.message);
      setSinTurno(true);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [conductorId]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─── Actualizar ubicación en tiempo real
  const actualizarUbicacion = async () => {
    try {
      setActualizandoUbicacion(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permiso requerido", "Activa la ubicación para compartir tu posición.");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const resultado = await actualizarUbicacionConductor(
        conductorId,
        loc.coords.latitude,
        loc.coords.longitude,
        loc.coords.speed ?? null
      );

      if (resultado.success) {
        Alert.alert("Éxito", "Ubicación actualizada en tiempo real");
      } else {
        Alert.alert("Error", resultado.error);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo obtener tu ubicación");
      console.error("Error:", error);
    } finally {
      setActualizandoUbicacion(false);
    }
  };

  // ─── Timer para actualizar ubicación automáticamente
  useEffect(() => {
    if (!datos?.turno?.estado || datos.turno.estado !== "en_curso") {
      if (timerUbicacionRef.current) clearInterval(timerUbicacionRef.current);
      return;
    }

    // Actualizar ubicación cada 30 segundos cuando está en curso
    timerUbicacionRef.current = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await actualizarUbicacionConductor(
          conductorId,
          loc.coords.latitude,
          loc.coords.longitude,
          loc.coords.speed ?? null
        );
      } catch (e) {
        console.warn("Error en actualización automática:", e);
      }
    }, 30000); // 30 segundos

    return () => {
      if (timerUbicacionRef.current) clearInterval(timerUbicacionRef.current);
    };
  }, [datos?.turno?.estado, conductorId]);

  // ─── Cambiar estado del turno
  const cambiarEstadoTurno = async (nuevoEstado) => {
    if (!datos?.turno?.id) {
      Alert.alert("Error", "No hay turno disponible");
      return;
    }

    try {
      setCambiandoEstado(true);
      const resultado = await actualizarEstadoTurno(conductorId, nuevoEstado);

      if (resultado.success) {
        setModalEstadoVisible(false);
        Alert.alert("Éxito", `Turno cambió a ${nombreTurno(nuevoEstado)}`);
        // Recargar datos
        await cargarDatos(true);
      } else {
        Alert.alert("Error", resultado.error);
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo cambiar el estado");
      console.error("Error:", e);
    } finally {
      setCambiandoEstado(false);
    }
  };

  // ─── Pantalla de perfil
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
        onGuardado={(actualizado) => {
          if (actualizado) setPerfil((prev) => ({ ...prev, ...actualizado }));
        }}
        onBack={() => setMostrarPerfil(false)}
      />
    );
  }

  // ─── Estados de carga
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: T.background }}>
        <Header titulo="Mi turno" subtitulo="Cargando..." showBack={false} />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={styles.cargandoTexto}>Cargando tu turno de hoy...</Text>
        </View>
      </View>
    );
  }

  if (sinTurno) {
    return (
      <View style={{ flex: 1, backgroundColor: T.background }}>
        <Header titulo="Mi turno" subtitulo="Sin asignación" showBack={false} 
         iconoDerecha={
            <TouchableOpacity onPress={() => setMostrarPerfil(true)}>
              <Ionicons name="settings-outline" size={36} color="#fff" />
            </TouchableOpacity>
          }
        />
        <View style={styles.centrado}>
          <Ionicons name="calendar-clear-outline" size={56} color="#D1D5DB" />
          <Text style={styles.sinTurnoTitulo}>Sin turno asignado</Text>
          <Text style={styles.sinTurnoSub}>
            No tienes un turno programado para hoy. El administrador te asignará
            uno próximamente.
          </Text>
          <TouchableOpacity
            style={styles.btnRefresh}
            onPress={() => cargarDatos(true)}
            disabled={refrescando}
          >
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "600" }}>
              {refrescando ? "Buscando..." : "Buscar de nuevo"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!datos) return null;

  const { turno, ruta, vehiculo, paradas, totalPasajeros, historial } = datos;

  const capacidadMax = vehiculo?.capacidad ?? 0;
  const porcentaje =
    capacidadMax > 0 ? Math.round((totalPasajeros / capacidadMax) * 100) : 0;
  const barraColor = getBarraColor(porcentaje);

  return (
    <View style={styles.root}>
      <Header
        titulo="Mi turno"
        subtitulo={`Ruta ${ruta?.numeroRuta}: ${ruta?.nombre}`}
        showBack={false}
        iconoDerecha={
          <TouchableOpacity onPress={() => cargarDatos(true)} disabled={refrescando}>
            <Ionicons
              name="refresh-outline"
              size={22}
              color="#fff"
              style={{ opacity: refrescando ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarDatos(true)}
            tintColor={T.Button.primary.background}
          />
        }
      >
        {/* ─── Tarjeta Hero del turno */}
        <View style={[styles.heroCard, { borderLeftColor: ruta?.color || "#3B82F6" }]}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroLabel}>Ruta {ruta?.numeroRuta}</Text>
              <Text style={styles.heroRuta}>{ruta?.nombre}</Text>
            </View>
            <ChipEstado estado={turno?.estado} />
          </View>

          {/* Horario */}
          {(datos.turno?.horaInicio || datos.turno?.horaFin) && (
            <View style={styles.horarioRow}>
              <View style={styles.horarioDato}>
                <Ionicons name="time-outline" size={16} color={T.text.secondary} />
                <Text style={styles.horarioDatoTexto}>
                  {formatearHora(datos.turno?.horaInicio)} -{" "}
                  {formatearHora(datos.turno?.horaFin)}
                </Text>
              </View>
              {datos.turno?.nombreTurno && (
                <View style={styles.horarioDato}>
                  <Ionicons name="layers-outline" size={16} color={T.text.secondary} />
                  <Text style={styles.horarioDatoTexto}>
                    {nombreTurno(datos.turno.nombreTurno)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Vehículo */}
          {vehiculo && (
            <View style={styles.busRow}>
              <View style={styles.busDato}>
                <MaterialCommunityIcons
                  name="bus-front"
                  size={16}
                  color={T.text.secondary}
                />
                <Text style={styles.busDatoTexto}>{vehiculo.placa}</Text>
              </View>
              <View style={styles.busDato}>
                <Ionicons name="people-outline" size={16} color={T.text.secondary} />
                <Text style={styles.busDatoTexto}>
                  Cap. {vehiculo.capacidad} pasajeros
                </Text>
              </View>
            </View>
          )}

          {/* Ocupación */}
          <View>
            <View style={styles.ocupacionHeader}>
              <Text style={styles.ocupacionLabel}>Ocupación actual</Text>
              <Text style={styles.ocupacionContador}>
                {totalPasajeros} / {capacidadMax} pasajeros
              </Text>
            </View>
            <View style={styles.barraFondo}>
              <View
                style={[
                  styles.barraRelleno,
                  {
                    width: `${porcentaje}%`,
                    backgroundColor: barraColor,
                  },
                ]}
              />
            </View>
            {porcentaje > 0 && (
              <Text style={[styles.porcentajeTexto, { color: barraColor }]}>
                {porcentaje}% lleno
              </Text>
            )}
          </View>

          {/* Botón cambiar estado */}
          <TouchableOpacity
            style={[styles.btnCambiarEstado, { borderColor: ruta?.color || "#3B82F6" }]}
            onPress={() => setModalEstadoVisible(true)}
          >
            <Ionicons name="swap-horizontal" size={18} color={ruta?.color || "#3B82F6"} />
            <Text
              style={[
                styles.btnCambiarEstadoText,
                { color: ruta?.color || "#3B82F6" },
              ]}
            >
              Cambiar estado
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── Acciones */}
        <View style={styles.accionesRow}>
          <TouchableOpacity
            style={styles.accionCard}
            onPress={actualizarUbicacion}
            disabled={actualizandoUbicacion}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#DBEAFE" }]}>
              {actualizandoUbicacion ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <MaterialCommunityIcons
                  name="crosshairs-gps"
                  size={22}
                  color="#3B82F6"
                />
              )}
            </View>
            <Text style={styles.accionTexto}>Actualizar{"\n"}ubicación</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accionCard}
            onPress={() => router.push("/(conductor)/EnviarNotificacion")}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#FEE2E2" }]}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={22}
                color="#EF4444"
              />
            </View>
            <Text style={styles.accionTexto}>Reportar{"\n"}percance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accionCard}
            onPress={() => router.push("/(conductor)/mis-buses")}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#FEF3C7" }]}>
              <MaterialCommunityIcons name="information-outline" size={22} color="#F59E0B" />
            </View>
            <Text style={styles.accionTexto}>Mi{"\n"}vehículo</Text>
          </TouchableOpacity>
        </View>

        {/* ─── Recorrido de hoy */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Recorrido de hoy ({paradas.length})</Text>
          <View style={styles.paradasCard}>
            {paradas.length > 0 ? (
              paradas.map((parada, i) => {
                const esUltima = i === paradas.length - 1;
                const esPasada = i < 2;
                const esActual = i === 2;

                return (
                  <ItemParadaConductor
                    key={parada.id}
                    parada={parada}
                    esUltima={esUltima}
                    esPasada={esPasada}
                    esActual={esActual}
                  />
                );
              })
            ) : (
              <Text style={styles.textoSinParadas}>
                No hay paradas configuradas para esta ruta
              </Text>
            )}
          </View>
        </View>

        {/* ─── Historial */}
        {historial && historial.length > 0 && (
          <View style={styles.seccion}>
            <Text style={styles.tituloSeccion}>Turnos anteriores</Text>
            {historial.map((h, i) => {
              const duracionMin =
                h.hora_inicio_real && h.hora_fin_real
                  ? Math.round(
                      (new Date(h.hora_fin_real) - new Date(h.hora_inicio_real)) /
                        60000
                    )
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
                      {new Date(h.fecha).toLocaleDateString("es-CO", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </Text>
                    <Text style={styles.historialDetalle}>
                      {h.vehiculos?.placa || ""}
                      {duracionMin ? ` · ${duracionMin} min` : ""}
                    </Text>
                  </View>
                  <View style={[styles.chip, { backgroundColor: "#F3F4F6" }]}>
                    <Text style={[styles.chipTexto, { color: "#6B7280" }]}>
                      Completado
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Modal cambiar estado */}
      <ModalCambiarEstado
        visible={modalEstadoVisible}
        estadoActual={turno?.estado}
        onClose={() => setModalEstadoVisible(false)}
        onConfirm={cambiarEstadoTurno}
        loading={cambiandoEstado}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  contenido: { padding: 16, paddingBottom: 32, gap: 16 },

  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 32,
  },
  cargandoTexto: { fontSize: 14, color: T.text.secondary },
  sinTurnoTitulo: {
    fontSize: 18,
    fontWeight: "700",
    color: T.text.primary,
    textAlign: "center",
  },
  sinTurnoSub: {
    fontSize: 14,
    color: T.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  btnRefresh: {
    flexDirection: "row",
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
  },

  // ─── Hero card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroRuta: { fontSize: 17, fontWeight: "700", color: T.text.primary, marginTop: 4 },

  horarioRow: { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  horarioDato: { flexDirection: "row", alignItems: "center", gap: 6 },
  horarioDatoTexto: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },

  busRow: { flexDirection: "row", gap: 16 },
  busDato: { flexDirection: "row", alignItems: "center", gap: 6 },
  busDatoTexto: { fontSize: 13, color: T.text.secondary, fontWeight: "500" },

  ocupacionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  ocupacionLabel: { fontSize: 11, color: T.text.secondary, fontWeight: "600" },
  ocupacionContador: {
    fontSize: 11,
    fontWeight: "700",
    color: T.text.primary,
  },
  barraFondo: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  barraRelleno: { height: 8, borderRadius: 4 },
  porcentajeTexto: { fontSize: 11, fontWeight: "700", marginTop: 6, textAlign: "right" },

  btnCambiarEstado: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 6,
  },
  btnCambiarEstadoText: { fontWeight: "700", fontSize: 12 },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipTexto: { fontSize: 11, fontWeight: "600" },

  accionesRow: { flexDirection: "row", gap: 10 },
  accionCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  accionIcono: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  accionTexto: {
    fontSize: 11,
    fontWeight: "600",
    color: T.text.primary,
    textAlign: "center",
    lineHeight: 13,
  },

  seccion: { gap: 10 },
  tituloSeccion: {
    fontSize: 12,
    fontWeight: "700",
    color: T.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  paradasCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  paradaFila: { flexDirection: "row", gap: 12, minHeight: 60, marginBottom: 8 },
  paradaConector: { alignItems: "center", width: 24 },
  paradaPunto: {
    width: 12,
    height: 12,
    borderRadius: 6,
    zIndex: 1,
  },
  paradaLinea: { width: 2, flex: 1, marginTop: 4 },
  paradaContenido: { flex: 1, paddingBottom: 4 },
  paradaRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  paradaNombre: { fontSize: 14, fontWeight: "600", color: T.text.primary, flex: 1 },
  paradaPasada: { color: "#9CA3AF", textDecorationLine: "line-through" },
  badgeActual: {
    backgroundColor: "#FEF3C7",
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeActualText: { fontSize: 10, fontWeight: "700", color: "#92400E" },
  paradaMetadata: { flexDirection: "row", gap: 10, marginTop: 3 },
  paradaUsuarios: { fontSize: 11, color: "#3B82F6", fontWeight: "600" },
  paradaETA: { fontSize: 11, color: T.text.secondary, fontWeight: "500" },
  textoSinParadas: {
    fontSize: 13,
    color: T.text.secondary,
    textAlign: "center",
    paddingVertical: 16,
  },

  historialItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  historialEstado: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  historialFecha: { fontSize: 13, fontWeight: "700", color: T.text.primary },
  historialDetalle: { fontSize: 11, color: T.text.secondary, marginTop: 2 },

  // ─── Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: { fontSize: 16, fontWeight: "700", color: T.text.primary },

  modalEstados: { padding: 16, gap: 8 },
  estadoOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 10,
    borderLeftWidth: 3,
    backgroundColor: "#F9FAFB",
  },
  estadoOptionActive: {
    backgroundColor: "#F0FDF4",
    borderLeftColor: "#22C55E",
  },
  estadoDot: { width: 12, height: 12, borderRadius: 6 },
  estadoLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: T.text.primary },
  estadoLabelActive: { fontWeight: "700" },

  modalLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
});