import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "../../../components/Header";
import theme from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { supabase } from "../../../services/supabase";
import {
  obtenerUbicacionBusActual,
  obtenerRutaCompletoId,
} from "../../../services/rutaServices";
import { getRutasCercanas } from "../../../services/dashboardUsuarioService";
import { ObtenerDireccionUsuario } from "../../../services/geocalizacion";
import {
  generarHtmlMapaRutaUsuario,
  calcularParadaMasCercana,
} from "./mapasUtilsUsuario";
import { StyleSheet } from "react-native";

const T = theme.lightMode;
const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// Alturas del bottom sheet
const SHEET_COLLAPSED = 110; // Solo chip visible
const SHEET_PARTIAL = 300; // Info principal
const SHEET_FULL = SCREEN_HEIGHT * 0.72; // Lista de paradas

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },

  // ── Mapa ──────────────────────────────────────────────────────────────────
  mapContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // ── Estados vacíos / carga ─────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: T.background,
    padding: 24,
  },
  errorTitle: {
    color: T.text.primary,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSub: {
    color: T.text.secondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  btnPrimary: {
    backgroundColor: T.Button.primary.background,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  btnSecondary: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.Button.primary.background,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
  },
  btnWarning: {
    backgroundColor: "#F59E0B",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  btnTextSecondary: {
    color: T.Button.primary.background,
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Badges flotantes sobre el mapa ─────────────────────────────────────────
  badgeTop: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },

  // ── Botones flotantes derecha ──────────────────────────────────────────────
  fab: {
    position: "absolute",
    right: 14,
    zIndex: 10,
    gap: 10,
    alignItems: "center",
  },
  fabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
  },
  fabBtnPrimary: {
    backgroundColor: T.Button.primary.background,
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
    overflow: "hidden",
  },
  sheetHandle: {
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
  },

  // ── Chip de ruta (siempre visible) ─────────────────────────────────────────
  routeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  routeColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  routeChipTexts: {
    flex: 1,
  },
  routeName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.1,
  },
  routeSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  sheetChevron: {
    opacity: 0.5,
  },

  // ── Sección principal del sheet ─────────────────────────────────────────────
  sheetBody: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginBottom: 16,
  },

  // Tarjeta parada más cercana
  nearCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  nearCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  nearCardTexts: { flex: 1 },
  nearCardTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  nearCardName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#78350F",
  },
  nearCardDist: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },

  // Tarjeta viaje
  tripRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  tripCol: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    padding: 12,
  },
  tripLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tripValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  tripIcon: {
    marginBottom: 6,
  },

  // Tarjeta bus
  busCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  busOffCard: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  busIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  busOffIconBox: {
    backgroundColor: "#FEE2E2",
  },
  busCardTexts: { flex: 1 },
  busCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
  busOffCardTitle: {
    color: "#B91C1C",
  },
  busCardSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  busBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  busBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22C55E",
  },
  busBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },

  // Lista de paradas
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 0,
  },
  stopLine: {
    alignItems: "center",
    width: 24,
    marginRight: 10,
  },
  stopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    zIndex: 1,
  },
  stopDotNear: {
    backgroundColor: "#F59E0B",
    shadowColor: "#F59E0B",
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  stopDotOrigen: {
    backgroundColor: "#22C55E",
    shadowColor: "#22C55E",
  },
  stopDotDestino: {
    backgroundColor: "#EF4444",
    shadowColor: "#EF4444",
  },
  stopConnector: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: "#E5E7EB",
    marginVertical: 2,
  },
  stopContent: {
    flex: 1,
    paddingBottom: 16,
  },
  stopName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  stopNameNear: {
    color: "#B45309",
  },
  stopMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  stopBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginTop: 4,
    fontSize: 10,
    fontWeight: "700",
  },
});

// ── Componente principal ────────────────────────────────────────────────────

const MapaRutaUsuario = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showError, showSuccess, showWarning } = useToast();

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ruta, setRuta] = useState(null);
  const [paradas, setParadas] = useState([]);
  const [ubicacionBus, setUbicacionBus] = useState(null);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [error, setError] = useState(null);
  const [paradaOrigen, setParadaOrigen] = useState(null);
  const [paradaDestino, setParadaDestino] = useState(null);
  const [paradaMasCercana, setParadaMasCercana] = useState(null);
  const [notificandoAdmin, setNotificandoAdmin] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  const webViewRef = useRef(null);
  const timerActualizacionRef = useRef(null);

  // ── Bottom sheet animado ──────────────────────────────────────────────────
  const sheetY = useRef(new Animated.Value(SHEET_PARTIAL)).current;
  const lastY = useRef(SHEET_PARTIAL);
  const sheetState = useRef("partial"); // collapsed | partial | full
  const [sheetOpen, setSheetOpen] = useState("partial");

  const snapTo = (targetHeight, label) => {
    lastY.current = targetHeight;
    sheetState.current = label;
    setSheetOpen(label);
    Animated.spring(sheetY, {
      toValue: targetHeight,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
    onPanResponderMove: (_, g) => {
      const newH = Math.max(
        SHEET_COLLAPSED,
        Math.min(SHEET_FULL, lastY.current + g.dy * -1),
      );
      sheetY.setValue(newH);
    },
    onPanResponderRelease: (_, g) => {
      const velocity = g.vy;
      const current = lastY.current + g.dy * -1;

      if (velocity < -0.5 || current > SHEET_PARTIAL + 60) {
        snapTo(SHEET_FULL, "full");
      } else if (velocity > 0.5 || current < SHEET_PARTIAL - 60) {
        snapTo(SHEET_COLLAPSED, "collapsed");
      } else {
        snapTo(SHEET_PARTIAL, "partial");
      }
    },
  });

  // ── Efectos ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (user?.id) cargarDatos();
  }, [user?.id]);

  useEffect(() => {
    if (!ruta?.id) return;
    const tick = async () => {
      const busData = await obtenerUbicacionBusActual(ruta.id);
      if (busData) {
        setUbicacionBus(busData);
        webViewRef.current?.postMessage(
          JSON.stringify({
            tipo: "actualizarUbicacionBus",
            ...busData,
            centrar: false,
          }),
        );
      }
    };
    timerActualizacionRef.current = setInterval(tick, 10000);
    return () => clearInterval(timerActualizacionRef.current);
  }, [ruta?.id]);

  useEffect(() => {
    if (ubicacionUsuario && paradas.length > 0) {
      setParadaMasCercana(calcularParadaMasCercana(ubicacionUsuario, paradas));
    }
  }, [ubicacionUsuario, paradas]);

  // ── Carga de datos ────────────────────────────────────────────────────────
  const cargarDatos = async () => {
    if (!user?.id) return;
    try {
      setCargando(true);
      setError(null);

      const rutasCercanas = await getRutasCercanas(user.id);
      if (!rutasCercanas?.length) {
        setError("No hay rutas cercanas a tu ubicación");
        return;
      }

      const rutaMasCercana = rutasCercanas[0];
      const rutaData = await obtenerRutaCompletoId(rutaMasCercana.rutaId);
      if (!rutaData) {
        setError("No se pudo cargar la ruta más cercana");
        return;
      }

      setRuta(rutaData);
      setParadas(rutaData.paradas || []);

      const busData = await obtenerUbicacionBusActual(rutaMasCercana.rutaId);
      setUbicacionBus(busData);

      const userLocation = await ObtenerDireccionUsuario(user.id);
      if (userLocation) setUbicacionUsuario(userLocation);

      const { data: asignacion } = await supabase
        .from("asignacion_usuario_ruta")
        .select("parada_origen_id, parada_destino_id")
        .eq("usuario_id", user.id)
        .eq("ruta_id", rutaMasCercana.rutaId)
        .order("fecha_asignacion", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (asignacion?.parada_origen_id) {
        const { data: o } = await supabase
          .from("paradas")
          .select("id,nombre,latitud,longitud")
          .eq("id", asignacion.parada_origen_id)
          .single();
        if (o) setParadaOrigen(o);
      }
      if (asignacion?.parada_destino_id) {
        const { data: d } = await supabase
          .from("paradas")
          .select("id,nombre,latitud,longitud")
          .eq("id", asignacion.parada_destino_id)
          .single();
        if (d) setParadaDestino(d);
      }

      setUltimaActualizacion(new Date());
      showSuccess("Ruta cargada");
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError(err.message || "Error al cargar la ruta");
      showError("Error cargando la ruta");
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const handleRefresh = async () => {
    setRefrescando(true);
    await cargarDatos();
  };

  const notificarAdministrador = async () => {
    try {
      setNotificandoAdmin(true);
      const { error: e } = await supabase.from("notificaciones").insert({
        usuario_id: user.id,
        tipo: "solicitud_ruta",
        titulo: "Usuario sin ruta asignada",
        mensaje: `El usuario ${user.profile?.nombre || "sin nombre"} (${user.email}) requiere asignación de ruta`,
        leido: false,
      });
      if (e) throw e;
      showSuccess("Notificación enviada al administrador");
    } catch (err) {
      showError("Error al enviar notificación");
    } finally {
      setNotificandoAdmin(false);
    }
  };

  const centrarEnUsuario = () => {
    if (!ubicacionUsuario) {
      showWarning("Tu ubicación no está disponible");
      return;
    }
    webViewRef.current?.postMessage(
      JSON.stringify({
        tipo: "centrarMapa",
        lat: ubicacionUsuario.latitud,
        lon: ubicacionUsuario.longitud,
      }),
    );
  };

  const centrarEnBus = () => {
    if (!ubicacionBus) {
      showWarning("El bus no tiene ubicación disponible");
      return;
    }
    webViewRef.current?.postMessage(
      JSON.stringify({
        tipo: "actualizarUbicacionBus",
        ...ubicacionBus,
        centrar: true,
      }),
    );
  };

  // ── Pantallas de estado ───────────────────────────────────────────────────
  if (cargando) {
    return (
      <View style={{ flex: 1, backgroundColor: T.background }}>
        <Header
          titulo="Mi ruta"
          subtitulo="Buscando ruta cercana..."
          showBack={false}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text
            style={{ color: T.text.secondary, marginTop: 16, fontSize: 14 }}
          >
            Calculando la ruta más cercana...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: T.background }}>
        <Header
          titulo="Mi ruta"
          subtitulo="Sin ruta disponible"
          showBack={false}
        />
        <View style={styles.centered}>
          <Ionicons name="map-outline" size={64} color="#D1D5DB" />
          <Text style={styles.errorTitle}>Sin ruta disponible</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity
            style={styles.btnWarning}
            onPress={notificarAdministrador}
            disabled={notificandoAdmin}
          >
            <Text style={styles.btnText}>
              {notificandoAdmin ? "Enviando..." : "Notificar al administrador"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={handleRefresh}
            disabled={refrescando}
          >
            <Text style={styles.btnText}>
              {refrescando ? "Buscando..." : "Buscar de nuevo"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnSecondary}
            onPress={() => router.push("/home?tab=notificaciones")}
          >
            <Text style={styles.btnTextSecondary}>Ver notificaciones</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const htmlMapa = generarHtmlMapaRutaUsuario({
    rutaTrayecto: ruta?.trayecto,
    paradas,
    paradaOrigen,
    paradaDestino,
    ubicacionUsuario,
    ubicacionBus,
    paradaMasCercana,
    colorRuta: ruta?.color || "#3B82F6",
  });

  const tiempoActualizacion = ultimaActualizacion.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const colorRuta = ruta?.color || "#3B82F6";

  // ── Render principal ──────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* Header transparente */}
      <Header
        titulo="Mi ruta"
        subtitulo={`Ruta ${ruta?.numero_ruta || ""}: ${ruta?.nombre || ""}`}
        showBack={false}
        iconoDerecha={
          <TouchableOpacity onPress={handleRefresh} disabled={refrescando}>
            <Ionicons
              name="refresh-outline"
              size={22}
              color="#fff"
              style={{ opacity: refrescando ? 0.5 : 1 }}
            />
          </TouchableOpacity>
        }
      />

      {/* Mapa a pantalla completa */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlMapa }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={["*"]}
          onError={(e) => {
            console.error("WebView error:", e.nativeEvent);
            showError("Error al cargar el mapa");
          }}
        />
      </View>

      {/* Chips de estado flotantes (esquina superior derecha del mapa) */}
      <View style={[styles.badgeTop, { top: 80 }]}>
        {ubicacionBus ? (
          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: "#22C55E" }]} />
            <Text style={styles.chipText}>Bus en línea</Text>
          </View>
        ) : (
          <View style={styles.chip}>
            <View style={[styles.chipDot, { backgroundColor: "#EF4444" }]} />
            <Text style={styles.chipText}>Bus sin señal</Text>
          </View>
        )}
        {paradaMasCercana && (
          <View style={styles.chip}>
            <Ionicons name="location" size={12} color="#F59E0B" />
            <Text style={styles.chipText}>
              P{paradaMasCercana.orden} ·{" "}
              {paradaMasCercana.distancia < 1000
                ? `${paradaMasCercana.distancia}m`
                : `${(paradaMasCercana.distancia / 1000).toFixed(1)}km`}
            </Text>
          </View>
        )}
      </View>

      {/* FABs flotantes derecha */}
      <Animated.View
        style={[
          styles.fab,
          { bottom: Animated.add(sheetY, new Animated.Value(14)) },
        ]}
      >
        {/* Centrar en bus */}
        <TouchableOpacity
          style={[styles.fabBtn, !ubicacionBus && { opacity: 0.4 }]}
          onPress={centrarEnBus}
          disabled={!ubicacionBus}
        >
          <Text style={{ fontSize: 18 }}>🚌</Text>
        </TouchableOpacity>

        {/* Centrar en usuario */}
        <TouchableOpacity
          style={[styles.fabBtn, !ubicacionUsuario && { opacity: 0.4 }]}
          onPress={centrarEnUsuario}
          disabled={!ubicacionUsuario}
        >
          <Ionicons
            name="locate"
            size={20}
            color={T.Button.primary.background}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* ── Bottom Sheet ────────────────────────────────────────────────── */}
      <Animated.View style={[styles.sheet, { height: sheetY }]}>
        {/* Handle / drag area */}
        <View {...panResponder.panHandlers}>
          <View style={styles.sheetHandle}>
            <View style={styles.sheetPill} />
          </View>

          {/* Chip de ruta siempre visible */}
          <TouchableOpacity
            style={styles.routeChip}
            activeOpacity={0.7}
            onPress={() =>
              snapTo(
                sheetState.current === "partial" ? SHEET_FULL : SHEET_PARTIAL,
                sheetState.current === "partial" ? "full" : "partial",
              )
            }
          >
            <View
              style={[styles.routeColorDot, { backgroundColor: colorRuta }]}
            />
            <View style={styles.routeChipTexts}>
              <Text style={styles.routeName} numberOfLines={1}>
                Ruta {ruta?.numero_ruta}: {ruta?.nombre}
              </Text>
              <Text style={styles.routeSub}>
                {paradas.length} paradas · toca para{" "}
                {sheetOpen === "full" ? "reducir" : "ver más"}
              </Text>
            </View>
            <Ionicons
              name={sheetOpen === "full" ? "chevron-down" : "chevron-up"}
              size={18}
              color="#9CA3AF"
              style={styles.sheetChevron}
            />
          </TouchableOpacity>
        </View>

        {/* Contenido scrolleable */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.sheetBody}
          showsVerticalScrollIndicator={false}
          scrollEnabled={sheetOpen === "full"}
        >
          <View style={styles.divider} />

          {/* Parada más cercana */}
          {paradaMasCercana && (
            <View style={styles.nearCard}>
              <View style={styles.nearCardIcon}>
                <Ionicons name="walk" size={18} color="#D97706" />
              </View>
              <View style={styles.nearCardTexts}>
                <Text style={styles.nearCardTitle}>Parada más cercana</Text>
                <Text style={styles.nearCardName}>
                  P{paradaMasCercana.orden} · {paradaMasCercana.paradas?.nombre}
                </Text>
                <Text style={styles.nearCardDist}>
                  {paradaMasCercana.distancia < 1000
                    ? `A ${paradaMasCercana.distancia} metros`
                    : `A ${(paradaMasCercana.distancia / 1000).toFixed(1)} km`}
                </Text>
              </View>
            </View>
          )}

          {/* Origen y destino */}
          <View style={styles.tripRow}>
            <View style={styles.tripCol}>
              <View style={styles.tripIcon}>
                <Ionicons name="radio-button-on" size={16} color="#22C55E" />
              </View>
              <Text style={styles.tripLabel}>Origen</Text>
              <Text style={styles.tripValue} numberOfLines={2}>
                {paradaOrigen?.nombre || "No asignado"}
              </Text>
            </View>
            <View style={styles.tripCol}>
              <View style={styles.tripIcon}>
                <Ionicons name="flag" size={16} color="#EF4444" />
              </View>
              <Text style={styles.tripLabel}>Destino</Text>
              <Text style={styles.tripValue} numberOfLines={2}>
                {paradaDestino?.nombre || "No asignado"}
              </Text>
            </View>
          </View>

          {/* Estado del bus */}
          <View style={[styles.busCard, !ubicacionBus && styles.busOffCard]}>
            <View
              style={[styles.busIconBox, !ubicacionBus && styles.busOffIconBox]}
            >
              <Text style={{ fontSize: 20 }}>🚌</Text>
            </View>
            <View style={styles.busCardTexts}>
              {ubicacionBus ? (
                <>
                  <Text style={styles.busCardTitle}>Bus en ruta</Text>
                  <Text style={styles.busCardSub}>
                    {ubicacionBus.velocidad || 0} km/h · actualizado{" "}
                    {tiempoActualizacion}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.busCardTitle, styles.busOffCardTitle]}>
                    Bus sin conexión
                  </Text>
                  <Text style={styles.busCardSub}>
                    No hay señal del vehículo en este momento
                  </Text>
                </>
              )}
            </View>
            {ubicacionBus && (
              <View style={styles.busBadge}>
                <View style={styles.busBadgeDot} />
                <Text style={styles.busBadgeText}>LIVE</Text>
              </View>
            )}
          </View>

          {/* Lista de paradas (solo visible en estado full) */}
          {sheetOpen === "full" && paradas.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                Paradas de la ruta ({paradas.length})
              </Text>
              {paradas.map((p, index) => {
                const esUltima = index === paradas.length - 1;
                const esOrigen = p.parada_id === paradaOrigen?.id;
                const esDestino = p.parada_id === paradaDestino?.id;
                const esCercana =
                  paradaMasCercana?.paradas?.id === p.paradas?.id;

                let dotStyle = styles.stopDot;
                let nameStyle = styles.stopName;
                if (esOrigen) {
                  dotStyle = [styles.stopDot, styles.stopDotOrigen];
                }
                if (esDestino) {
                  dotStyle = [styles.stopDot, styles.stopDotDestino];
                }
                if (esCercana) {
                  dotStyle = [styles.stopDot, styles.stopDotNear];
                  nameStyle = [styles.stopName, styles.stopNameNear];
                }

                return (
                  <View key={p.parada_id || index} style={styles.stopRow}>
                    <View style={styles.stopLine}>
                      <View style={dotStyle} />
                      {!esUltima && <View style={styles.stopConnector} />}
                    </View>
                    <View style={styles.stopContent}>
                      <Text style={nameStyle} numberOfLines={1}>
                        {p.paradas?.nombre || `Parada ${p.orden}`}
                      </Text>
                      {p.tiempo_desde_inicio != null && (
                        <Text style={styles.stopMeta}>
                          {p.tiempo_desde_inicio} min desde inicio
                        </Text>
                      )}
                      {esCercana && (
                        <Text
                          style={[
                            styles.stopBadge,
                            { backgroundColor: "#FEF3C7", color: "#92400E" },
                          ]}
                        >
                          Estás cerca aquí
                        </Text>
                      )}
                      {esOrigen && (
                        <Text
                          style={[
                            styles.stopBadge,
                            { backgroundColor: "#DCFCE7", color: "#15803D" },
                          ]}
                        >
                          Tu origen
                        </Text>
                      )}
                      {esDestino && (
                        <Text
                          style={[
                            styles.stopBadge,
                            { backgroundColor: "#FEE2E2", color: "#B91C1C" },
                          ]}
                        >
                          Tu destino
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default MapaRutaUsuario;
