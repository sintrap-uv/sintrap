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
import BotonesFlotantes from "../components/BotonesFlotantes"
import Header from "../components/Header";
import { getProfile } from "../services/profileService";
import { getCurrentUser } from "../services/auth";

// ── Importa aquí los componentes de cada tab ──────────────────
import EditarPerfilForm from "../components/forms/EditarPerfilForm";
import ProfileCard from "../components/ProfileCard";          // ← agregado
import ConductoresScreen from "./(admin)/conductores";
import RegistrarVehiculo from "./(admin)/registrar-vehiculo";
import { supabase } from "../services/supabase";

export default function Home() {
  const [tabActivo, setTabActivo] = useState("inicio");

  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [cargando, setCargando] = useState(true);
  const [serviceActive, setServiceActive] = useState(true);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const HEADER_CONFIGS = {
    usuario: {
      inicio: { titulo: `Hola ${perfil?.nombre ?? 'Usuario'}`, subtitulo: '¿a donde vamos hoy?' },
      favoritos: { titulo: "Mis Favoritos" },
      rutas: { titulo: "Rutas" },
      perfil: { titulo: "Mi Perfil" },
    },
    administrador: {
      inicio: { titulo: "Panel Administrativo", subtitulo: "Gestion rutas y buses" },
      rutas: { titulo: "Gestion de rutas", subtitulo: "Administrar las rutas del sistema" },
      crear: { titulo: "Crear Ruta", subtitulo: "Gestion de rutas" },
      buses: { titulo: "Buses", subtitulo: "Gestion de buses" },
      crear_Bus: { titulo: 'Crear bus', subtitulo: 'Registro de unidad' },
      crear_Conductor: { titulo: 'Crear Conductor', subtitulo: 'Registro de personal' },
      crear_Ruta: { titulo: 'Crear Ruta', subtitulo: 'Registra tu ruta' },
      graficas: { titulo: "Estadisticas", subtitulo: "Actividad del sistema" },
    },
    conductor: {
      inicio: { titulo: "Panel conductor" },
      rutas: { titulo: "Gestion de rutas" },
      crear: { titulo: "Crear Ruta" },
      buses: { titulo: "Buses" },
    }
  };

  const cargarPerfil = async () => {
    try {
      const { data: authData } = await getCurrentUser();
      const user = authData?.user;
      if (!user) return;

      setUserId(user.id);
      setUserEmail(user.email ?? "");

      const { data: perfilData } = await getProfile(user.id);
      if (perfilData) setPerfil(perfilData);

    } catch (e) {
      console.error('Error cargando perfil:', e.message);
    } finally {
      setCargando(false);
    }
  };

  // ✅ Actualiza el perfil en tiempo real con merge
  const handleGuardado = (actualizado) => {
    if (actualizado) {
      setPerfil((prev) => ({ ...prev, ...actualizado }));
    } else {
      cargarPerfil();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── Contenido por ROL + TAB ──────────────────────────────────
  const CONTENIDO = {

    // ── ADMINISTRADOR ──
    administrador: {
      inicio: () => < TabPendiente nombre="Inicio" icono="home"/>,
      rutas: () => <TabPendiente nombre="Gestión de rutas" icono="map-outline" />,
      crear: () => <TabPendiente nombre="Crear ruta" icono="add-circle-outline" />,
      buses: () => <TabPendiente nombre="Buses" icono="bus" />,
      graficas: () => <TabPendiente nombre="Estadísticas" icono="bar-chart-outline" />,
      crear_Ruta: () => <TabPendiente nombre='listado de rutas' />,
      crear_Conductor:() => <ConductoresScreen />,
      crear_Bus:() => <RegistrarVehiculo />,
        // ✅ Perfil → ProfileCard que abre EditarPerfilForm internamente
        perfil:   () => (
          <ProfileCard
            name={perfil?.nombre ?? ""}
            email={userEmail}
            avatarUri={perfil?.avatar_url ?? null}
            role={perfil?.rol ?? "administrador"}
            isActive={perfil?.activo ?? true}
            loading={false}
            perfilInicial={perfil}
            userId={userId}
            onGuardado={handleGuardado}
            onTripHistory={() => console.log("Historial")}
            onNotifications={() => console.log("Notificaciones")}
            onSettings={() => console.log("Configuración")}
            onChangePassword={() => console.log("Cambiar contraseña")}
            onLogout={handleLogout}
            onManageUsers={() => console.log("Gestión usuarios")}
            onReports={() => console.log("Reportes")}
            onManageRoutes={() => console.log("Gestión rutas")}
          />
        ),
    },

// ── CONDUCTOR ──
conductor: {
  inicio: () => (
    <LinearGradient colors={["#2D6A2D", "#A8D5A2", "#e8f5e9"]} style={styles.gradient}>
      <TouchableOpacity style={styles.alertBtn}>
        <Ionicons name="notifications" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.alertText}>Avisarme cuando el bus este cerca</Text>
      </TouchableOpacity>
    </LinearGradient>
  ),
    rutas: () => <TabPendiente nombre="Mi Ruta" icono="navigate-outline" />,
      agregar: () => <TabPendiente nombre="Reportar incidente" icono="warning-outline" />,
        bus: () => <TabPendiente nombre="Buses" icono="bus" />,
          // ✅ Perfil → ProfileCard que abre EditarPerfilForm internamente
          perfil: () => (
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
              onTripHistory={() => console.log("Historial")}
              onNotifications={() => console.log("Notificaciones")}
              onSettings={() => console.log("Configuración")}
              onChangePassword={() => console.log("Cambiar contraseña")}
              onLogout={handleLogout}
              onMyVehicle={() => console.log("Mi vehículo")}
              onAssignedRoutes={() => console.log("Rutas asignadas")}
              serviceActive={serviceActive}
              onToggleService={() => setServiceActive((prev) => !prev)}
            />
          ),
    },

// ── USUARIO ──
usuario: {
  inicio: () => (
    <LinearGradient colors={["#2D6A2D", "#A8D5A2", "#e8f5e9"]} style={styles.gradient}>
      <TouchableOpacity style={styles.alertBtn}>
        <Ionicons name="notifications" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.alertText}>Avisarme cuando el bus este cerca</Text>
      </TouchableOpacity>
    </LinearGradient>
  ),
    favoritos: () => <TabPendiente nombre="Favoritos" icono="heart-outline" />,
      rutas: () => <TabPendiente nombre="Rutas" icono="location-outline" />,
        // ✅ Perfil → ProfileCard que abre EditarPerfilForm internamente
        perfil: () => (
          <ProfileCard
            name={perfil?.nombre ?? ""}
            email={userEmail}
            avatarUri={perfil?.avatar_url ?? null}
            role={perfil?.rol ?? "usuario"}
            isActive={perfil?.activo ?? true}
            loading={false}
            perfilInicial={perfil}
            userId={userId}
            onGuardado={handleGuardado}
            onTripHistory={() => console.log("Historial")}
            onNotifications={() => console.log("Notificaciones")}
            onSettings={() => console.log("Configuración")}
            onChangePassword={() => console.log("Cambiar contraseña")}
            onLogout={handleLogout}
          />
        ),
    },
  };

const renderContenido = () => {
  const rol = perfil?.rol ?? "usuario";
  const tabsDelRol = CONTENIDO[rol] ?? CONTENIDO.usuario;
  const componente = tabsDelRol[tabActivo];
  return componente
    ? componente()
    : <TabPendiente nombre={tabActivo} icono="construct-outline" />;
};

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
    {tabActivo !== 'perfil' && (
      <Header
        titulo={HEADER_CONFIGS[perfil?.rol ?? 'usuario'][tabActivo]?.titulo ?? "Inicio"}
        subtitulo={HEADER_CONFIGS[perfil?.rol ?? 'usuario'][tabActivo]?.subtitulo ?? ""}
        mode="light"
        iconoDerecha={
          perfil?.rol === 'administrador' || perfil?.rol === 'conductor' ? (
            <TouchableOpacity onPress={() => setTabActivo('perfil')}>
              <Ionicons name="person-circle-outline" size={36} color="#fff" style={{ marginTop: -25 }} />
            </TouchableOpacity>
          ) : null
        }
      />
    )}

    {/* ── Área de contenido (cambia según el tab) ─────────── */}
    <View style={styles.contenido}>{renderContenido()}</View>

    {/* ── Navbar fijo abajo ───────────────────────────────── */}
    {tabActivo === 'crear' && (
      <BotonesFlotantes onAccion={(key) => {
        if (key === 'bus') setTabActivo('crear_Bus');
        if (key === 'conductor') setTabActivo('crear_Conductor');
        if (key === 'ruta') setTabActivo('crear_Ruta');
      }} />
    )}
    <BottomNavBar
      rol={perfil?.rol ?? 'usuario'}
      initialTab="inicio"
      onTabPress={(key) => setTabActivo(key)}
    />
  </View>
);
}

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
    flex: 1,
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
  centrado: { flex: 1, backgroundColor: "#fff", justifyContent: "center" },
});