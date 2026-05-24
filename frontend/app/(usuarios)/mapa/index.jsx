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
import { supabase } from "../../../services/supabase";
import {
  obtenerRutaActualUsuario,
  obtenerParadasRuta,
  obtenerUbicacionBusActual,
  obtenerRutaCompletoId,
} from "../../../services/rutaServices";
import { getRutasCercanas } from "../../../services/dashboardUsuarioService";
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
    flex: 4.5, // MEJORADO: Más grande (de flex: 1)
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
    flex: 1.5, // MEJORADO: Reducido (ocupaba todo)
    backgroundColor: T.cards.background,
    borderTopWidth: 1,
    borderColor: T.input.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  routeTitle: {
    color: T.text.primary,
    fontWeight: "bold",
    fontSize: 14, // MEJORADO: Reducido de 16
    marginBottom: 8, // MEJORADO: Reducido de 12
  },
  infoRow: {
    marginBottom: 4, // MEJORADO: Reducido de 8 (más compacto)
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoLabel: {
    color: T.text.secondary,
    fontSize: 11, // MEJORADO: Reducido de 12
    fontWeight: "500",
    width: 70,
  },
  infoValue: {
    color: T.text.primary,
    fontSize: 11, // MEJORADO: Reducido de 12
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
  actionButtonWarning: {
    backgroundColor: "#F59E0B", // Botón notificación en naranja
  },
  actionButtonText: {
    color: T.Button.primary.Text,
    fontSize: 12,
    fontWeight: "600",
  },
  statusBadge: {
    marginTop: 8, // MEJORADO: Reducido de 12
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

  // NUEVO: Estados para parada origen y destino (consultadas independientemente)
  const [paradaOrigen, setParadaOrigen] = useState(null);
  const [paradaDestino, setParadaDestino] = useState(null);
  const [notificandoAdmin, setNotificandoAdmin] = useState(false);

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

      // 1. Obtener rutas cercanas al usuario
      const rutasCercanas = await getRutasCercanas(user.id);
      if (!rutasCercanas || rutasCercanas.length === 0) {
        setError("No hay rutas cercanas a tu ubicación");
        return;
      }

      // 2. Tomar la PRIMERA ruta (la más cercana)
      const rutaMasCercana = rutasCercanas[0];
      
      // 3. Obtener datos completos de esa ruta
      const rutaData = await obtenerRutaCompletoId(rutaMasCercana.rutaId);
      if (!rutaData) {
        setError("No se pudo cargar la ruta más cercana");
        return;
      }

      setRuta(rutaData);
      setParadas(rutaData.paradas || []);

      // 4. Obtener ubicación actual del bus
      const busData = await obtenerUbicacionBusActual(rutaMasCercana.rutaId);
      setUbicacionBus(busData);

      // 5. Obtener ubicación del usuario (si está disponible)
      const userLocation = await ObtenerDireccionUsuario(user.id);
      if (userLocation) {
        setUbicacionUsuario(userLocation);
      }

      // 6. Obtener parada origen y destino desde BD
      // Para la ruta más cercana, buscar si hay asignación específica de origen/destino
      const { data: asignacionUsuario } = await supabase
        .from("asignacion_usuario_ruta")
        .select("parada_origen_id, parada_destino_id")
        .eq("usuario_id", user.id)
        .eq("ruta_id", rutaMasCercana.rutaId)
        .order("fecha_asignacion", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (asignacionUsuario?.parada_origen_id) {
        const { data: origen } = await supabase
          .from("paradas")
          .select("id, nombre, latitud, longitud, descripcion")
          .eq("id", asignacionUsuario.parada_origen_id)
          .single();
        if (origen) setParadaOrigen(origen);
      }

      if (asignacionUsuario?.parada_destino_id) {
        const { data: destino } = await supabase
          .from("paradas")
          .select("id, nombre, latitud, longitud, descripcion")
          .eq("id", asignacionUsuario.parada_destino_id)
          .single();
        if (destino) setParadaDestino(destino);
      }

      setUltimaActualizacion(new Date());
      showSuccess("Ruta más cercana cargada correctamente");
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

  // NUEVO: Notificar al administrador
  const notificarAdministrador = async () => {
    try {
      setNotificandoAdmin(true);

      const { error } = await supabase.from("notificaciones").insert({
        usuario_id: user.id,
        tipo: "solicitud_ruta",
        titulo: "Usuario sin ruta asignada",
        mensaje: `El usuario ${user.profile?.nombre || "sin nombre"} (${user.email}) requiere asignación de ruta`,
        leido: false,
      });

      if (error) throw error;

      showSuccess("Notificación enviada al administrador");
    } catch (err) {
      console.error("Error notificando:", err);
      showError("Error al enviar notificación");
    } finally {
      setNotificandoAdmin(false);
    }
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

          {/* NUEVO: Botón para notificar al administrador */}
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonWarning]}
            onPress={notificarAdministrador}
            disabled={notificandoAdmin}
          >
            <Text style={styles.actionButtonText}>
              {notificandoAdmin
                ? "Enviando notificación..."
                : "Notificar al administrador"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefresh}
            disabled={refrescando}
          >
            <Text style={styles.actionButtonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        scrollEnabled={true}
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
            {paradaOrigen?.nombre || "Cargando..."}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Destino:</Text>
          <Text style={styles.infoValue}>
            {paradaDestino?.nombre || "Cargando..."}
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
