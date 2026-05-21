import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Header from "../../../components/Header";
import theme from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import {
  obtenerRutaActualUsuario,
  obtenerParadasRuta,
  obtenerUbicacionBusActual,
} from "../../../services/rutaServices";
import { ObtenerDireccionUsuario } from "../../../services/geocalizacion";
import { generarHtmlMapaRutaUsuario } from "./mapasUtilsUsuario";
import { StyleSheet } from "react-native";

const T = theme.lightMode;

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: T.background,
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: T.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: T.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorText: {
    color: T.text.primary,
    textAlign: "center",
    fontSize: 16,
    marginBottom: 12,
  },
  errorSubText: {
    color: T.text.secondary,
    textAlign: "center",
    fontSize: 14,
  },
  infoPanel: {
    backgroundColor: T.cards.background,
    borderTopWidth: 1,
    borderColor: T.input.border,
    padding: 16,
    paddingBottom: 20,
  },
  routeTitle: {
    color: T.text.primary,
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLabel: {
    color: T.text.secondary,
    fontSize: 12,
    fontWeight: "500",
    width: 80,
  },
  infoValue: {
    color: T.text.primary,
    fontSize: 12,
    flex: 1,
  },
  actionButton: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: T.Button.primary.background,
    alignItems: "center",
  },
  actionButtonText: {
    color: T.Button.primary.Text,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderLeftWidth: 3,
    borderLeftColor: "#22C55E",
  },
  statusText: {
    color: "#22C55E",
    fontSize: 12,
    fontWeight: "500",
  },
});

const MapaRutaUsuario = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showError, showSuccess, showInfo } = useToast();

  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [ruta, setRuta] = useState(null);
  const [paradas, setParadas] = useState([]);
  const [ubicacionBus, setUbicacionBus] = useState(null);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());

  const webViewRef = useRef(null);
  const timerActualizacionRef = useRef(null);

  // Cargar datos iniciales
  useEffect(() => {
    if (user?.id) {
      cargarDatos();
    }
  }, [user?.id]);

  // Actualizar ubicación del bus cada 10 segundos
  useEffect(() => {
    if (!ruta?.ruta_id) return;

    const actualizarUbicacion = async () => {
      const busData = await obtenerUbicacionBusActual(ruta.ruta_id);
      if (busData) {
        setUbicacionBus(busData);
        // Enviar al WebView para actualizar marcador
        webViewRef.current?.postMessage(
          JSON.stringify({
            tipo: "actualizarUbicacionBus",
            ...busData,
            centrar: false,
          }),
        );
      }
    };

    timerActualizacionRef.current = setInterval(actualizarUbicacion, 10000);

    return () => {
      if (timerActualizacionRef.current) {
        clearInterval(timerActualizacionRef.current);
      }
    };
  }, [ruta?.ruta_id]);

  const cargarDatos = async () => {
    if (!user?.id) return;

    try {
      setCargando(true);
      setError(null);

      // 1. Obtener ruta del usuario
      const rutaData = await obtenerRutaActualUsuario(user.id);
      if (!rutaData) {
        setError("No tienes ninguna ruta asignada en este momento");
        return;
      }

      setRuta(rutaData);

      // 2. Obtener paradas
      const paradasData = await obtenerParadasRuta(rutaData.ruta_id);
      setParadas(paradasData);

      // 3. Obtener ubicación actual del bus
      const busData = await obtenerUbicacionBusActual(rutaData.ruta_id);
      setUbicacionBus(busData);

      // 4. Obtener ubicación del usuario (si está disponible)
      const userLocation = await ObtenerDireccionUsuario(user.id);
      if (userLocation) {
        setUbicacionUsuario(userLocation);
      }

      setUltimaActualizacion(new Date());
      showSuccess("Ruta cargada correctamente");
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

  if (cargando) {
    return (
      <View style={[styles.contenedor]}>
        <Header
          titulo="Tu ruta asignada"
          subtitulo="Cargando..."
          showBack={false}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={{ color: T.text.secondary, marginTop: 16 }}>
            Cargando ruta...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.contenedor]}>
        <Header titulo="Tu ruta asignada" subtitulo="Mapa" showBack={false} />
        <View style={styles.errorContainer}>
          <View style={styles.errorIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={56}
              color={T.Button.danger?.background || "#EF4444"}
            />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubText}>
            Contacta con el administrador si crees que esto es un error
          </Text>
          <TouchableOpacity
            style={[styles.actionButton, { marginTop: 24 }]}
            onPress={handleRefresh}
          >
            <Text style={styles.actionButtonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const paradaOrigen = paradas.find(
    (p) => p.parada_id === ruta?.parada_origen_id,
  )?.paradas;
  const paradaDestino = paradas.find(
    (p) => p.parada_id === ruta?.parada_destino_id,
  )?.paradas;

  const htmlMapa = generarHtmlMapaRutaUsuario({
    rutaTrayecto: ruta?.rutas?.trayecto,
    paradas: paradas,
    paradaOrigen,
    paradaDestino,
    ubicacionUsuario,
    ubicacionBus,
    colorRuta: ruta?.rutas?.color || "#3B82F6",
  });

  const tiempoActualizacion = ultimaActualizacion.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.contenedor]}>
      <Header
        titulo="Tu ruta asignada"
        subtitulo={ruta?.rutas?.nombre || "Cargando..."}
        showBack={false}
        iconoDerecha={
          <TouchableOpacity onPress={handleRefresh} disabled={refrescando}>
            <Ionicons
              name={refrescando ? "reload" : "refresh-outline"}
              size={24}
              color="#fff"
              style={{ opacity: refrescando ? 0.6 : 1 }}
            />
          </TouchableOpacity>
        }
      />

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

      <ScrollView
        style={styles.infoPanel}
        scrollEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={handleRefresh}
            tintColor={T.Button.primary.background}
          />
        }
      >
        <Text style={styles.routeTitle}>
          Ruta {ruta?.rutas?.numero_ruta}: {ruta?.rutas?.nombre}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Origen:</Text>
          <Text style={styles.infoValue}>
            {paradaOrigen?.nombre || "No asignado"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Destino:</Text>
          <Text style={styles.infoValue}>
            {paradaDestino?.nombre || "No asignado"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Paradas:</Text>
          <Text style={styles.infoValue}>{paradas.length} en total</Text>
        </View>

        {ubicacionBus && (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bus:</Text>
              <Text style={styles.infoValue}>
                {ubicacionBus.velocidad || 0} km/h
              </Text>
            </View>

            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                ✓ Actualizado a las {tiempoActualizacion}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push("/home?tab=notificaciones")}
        >
          <Text style={styles.actionButtonText}>
            Ver notificaciones de ruta
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default MapaRutaUsuario;
