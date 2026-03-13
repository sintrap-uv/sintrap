import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BottomNavBar } from "../components/BottomNavBar";

// ── Importa aquí los componentes de cada tab ──────────────────
import EditarPerfilForm from "../components/forms/EditarPerfilForm";

const ROL_ACTUAL = "usuario"; // cambia a 'usuario' o 'administrador' para probar

export default function Home() {
  const [tabActivo, setTabActivo] = useState("inicio");

  const [perfil,   setPerfil]   = useState(null);
  const [userId,   setUserId]   = useState(null);
  const [cargando, setCargando] = useState(true);

  // Cargar usuario y perfil al iniciar la app
  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      const { data: authData } = await getCurrentUser();
      const user = authData?.user;
      if (!user) return;

      setUserId(user.id);

      const { data: perfilData } = await getProfile(user.id);
      if (perfilData) setPerfil(perfilData);

    } catch (e) {
      console.error('Error cargando perfil:', e.message);
    } finally {
      setCargando(false);
    }
  };

  const renderContenido = () => {
    switch (tabActivo) {
      case "inicio":
        return (
          <LinearGradient
            colors={["#2D6A2D", "#A8D5A2", "#e8f5e9"]}
            style={styles.gradient}
          >
            <TouchableOpacity style={styles.alertBtn}>
              <Ionicons
                name="notifications"
                size={16}
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text style={styles.alertText}>
                Avisarme cuando el bus este cerca
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        );

      // Tab "Mi Bus" del conductor → formulario de editar perfil
      case "bus":
        return (
          <EditarPerfilForm
            perfilInicial={perfil}
            userId={userId}
            onGuardado={(actualizado) => console.log("Guardado:", actualizado)}
          />
        );

      case "rutas":
        return <TabPendiente nombre="Rutas" icono="navigate-outline" />;

      case "agregar":
        return <TabPendiente nombre="Reportar" icono="add-circle-outline" />;

      case "favoritos":
        return <TabPendiente nombre="Favoritos" icono="star" />;

      case "perfil":
        return (
          <EditarPerfilForm
            perfilInicial={perfil}
            userId={userId}
            onGuardado={(actualizado) => console.log("Guardado:", actualizado)}
          />
        );

      default:
        return <TabPendiente nombre={tabActivo} icono="construct-outline" />;
    }
  };

  // Miestras carga, Muestra spinner en vez del header
  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Header fijo (siempre visible) ──────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Hola {perfil?.nombre?.split(' ')[0] ?? 'Usuario'}</Text>
        <Text style={styles.headerSub}>
          {tabActivo === "inicio"
            ? "¿A dónde vamos hoy?"
            : obtenerSubtitulo(tabActivo)}
        </Text>
      </View>

      {/* ── Área de contenido (cambia según el tab) ─────────── */}
      <View style={styles.contenido}>{renderContenido()}</View>

      {/* ── Navbar fijo abajo ───────────────────────────────── */}
      <BottomNavBar
        rol={ROL_ACTUAL}
        initialTab="inicio"
        onTabPress={(key) => setTabActivo(key)}
      />
    </View>
  );
}

// Subtítulo del header según tab activo
function obtenerSubtitulo(tab) {
  const subtitulos = {
    bus: "Tu información personal",
    rutas: "Tu ruta asignada",
    agregar: "Reportar un incidente",
    perfil: "Tu información personal",
    favoritos: "Tus rutas favoritas",
  };
  return subtitulos[tab] ?? "";
}

// Placeholder para tabs en desarrollo
function TabPendiente({ nombre, icono }) {
  return (
    <View style={styles.pendiente}>
      <Ionicons name={icono} size={48} color="#D1D5DB" />
      <Text style={styles.pendienteTexto}>{nombre}</Text>
      <Text style={styles.pendienteSubtexto}>Próximamente</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#1B5E20",
    paddingTop: Platform.OS === "ios" ? 56 : 48,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
  },
  headerSub: {
    fontSize: 14,
    color: "#A5D6A7",
    marginTop: 4,
  },
  contenido: {
    flex: 1, // ocupa todo el espacio entre header y navbar
  },
  gradient: {
    flex: 1,
    paddingTop: 40,
    alignItems: "center",
  },
  alertBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  alertText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "500",
  },
  pendiente: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  pendienteTexto: {
    fontSize: 18,
    fontWeight: "600",
    color: "#9CA3AF",
  },
  pendienteSubtexto: {
    fontSize: 13,
    color: "#D1D5DB",
  },
  centrado:    {flex: 1, backgroundColor: "#fff", justifyContent: "center"},
});