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
import { BottomNavBar } from "../components/BottomNavBar";
import BotonesFlotantes from "../components/BotonesFlotantes";
import Header from "../components/Header";
import { getProfile } from "../services/profileService";
import { getCurrentUser, signOut } from "../services/auth";

// ── Importa aquí los componentes de cada tab ──────────────────
import EditarPerfilForm from "../components/forms/EditarPerfilForm";
import ProfileCard from "../components/ProfileCard"; // ← agregado
import ConductoresScreen from "./(admin)/conductores";
import RegistrarVehiculo from "./(admin)/registrar-vehiculo";
import VehiculosScreen from "./(admin)/vehiculos"
import MisBusesScreen from "./(conductor)/mis-buses";
import Bienvenida from "./(admin)/bienvenida-empresa";

import DashboardAdmin from "./(admin)/DashboardAdmin";
import DashboardUsuario from "./profiles/DashboardUsuario";
import DashboardConductor from "./(conductor)/DashboardConductor"
import { supabase } from "../services/supabase";
import MapaColaboradores from "./(admin)/Mapa_colaboradores/mapa-Colaboradores";
import ConfiguracionBuses from "./(admin)/configurar-buses";
import { ObtenerDireccionUsuario } from "../services/geocalizacion";
import CajaDireccion from "../components/ModalDireccion";





export default function Home() {
  const [tabActivo, setTabActivo] = useState("inicio");

  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [cargando, setCargando] = useState(true);
  const [serviceActive, setServiceActive] = useState(true);

  const [mostrarModal, setMostarModal] = useState(true)

  const [colaboradores, setColaboradores] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [cargandoPrueba, setCargandoPrueba] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const HEADER_CONFIGS = {
    usuario: {
      inicio: {
        titulo: `Hola ${perfil?.nombre ?? "Usuario"}`,
        subtitulo: "¿a donde vamos hoy?",
      },
      favoritos: { titulo: "Mis Favoritos" },
      rutas: { titulo: "Rutas" },
      perfil: { titulo: "Mi Perfil" },
    },
    administrador: {
      inicio: {
        titulo: "Panel Administrativo",
        subtitulo: "Gestion rutas y buses",
      },
      rutas: {
        titulo: "Gestion de rutas",
        subtitulo: "Administrar las rutas del sistema",
      },
      crear: { titulo: "Crear Ruta", subtitulo: "Gestion de rutas" },
      buses: { titulo: "Buses", subtitulo: "Gestion de buses" },
      crear_Bus: { titulo: "Crear bus", subtitulo: "Registro de unidad" },
      crear_Conductor: {
        titulo: "Crear Conductor",
        subtitulo: "Registro de personal",
      },
      crear_Ruta: { titulo: "Crear Ruta", subtitulo: "Registra tu ruta" },
      graficas: { titulo: "Estadisticas", subtitulo: "Actividad del sistema" },
      mapa_colaboradores: { titulo: 'Mapa de colaboradores', subtitulo: 'Visualiza los grupos' },
      configurar_buses: { titulo: 'Configurar buses', subtitulo: 'Punto de salida' },
    },
    conductor: {
      inicio: { titulo: "Panel conductor" },
      rutas: { titulo: "Gestion de rutas" },
      crear: { titulo: "Crear Ruta" },
      buses: { titulo: "Buses" },
    },
  };

  const probarAgrupacion = async () => {
    setCargandoPrueba(true);

    try {
      // 1. Obtener colaboradores
      console.log("📡 Obteniendo colaboradores...");
      const data = await ubicacionColaboradores();
      setColaboradores(data);
      console.log(`✅ Encontrados ${data.length} colaboradores con ubicación`);

      // 2. Mostrar algunos ejemplos
      if (data.length > 0) {
        console.log("📋 Ejemplo de colaborador:");
        console.log(`   Nombre: ${data[0].nombre}`);
        console.log(`   Dirección: ${data[0].ubicacion_usuario?.[0]?.direccion}`);
        console.log(`   Coordenadas: ${data[0].ubicacion_usuario?.[0]?.latidud}, ${data[0].ubicacion_usuario?.[0]?.longitud}`);
      }

      // 3. Agrupar por cercanía
      console.log("🔄 Agrupando por cercanía...");
      const clusters = agruparPorCercania(data, 0.3);
      setGrupos(clusters);

      // 4. Mostrar resultados
      console.log(`✅ Se crearon ${clusters.length} grupos`);
      clusters.forEach((grupo, index) => {
        console.log(`📦 Grupo ${index + 1}: ${grupo.cantidad} personas`);
        grupo.colaboradores.forEach(col => {
          console.log(`   - ${col.nombre}`);
        });
      });

    } catch (error) {
      console.error("❌ Error:", error);
    } finally {
      setCargandoPrueba(false);
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

      const ubicacionData = await ObtenerDireccionUsuario(user.id);
      const tienedireccion = !!ubicacionData?.direccion;
      setMostarModal(!tienedireccion)



    } catch (e) {
      console.error('Error cargando perfil:', e.message);
    } finally {
      setCargando(false);
    }
  };

  //Actualiza el perfil en tiempo real con merge
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
 
      // ✅ Perfil → ProfileCard que abre EditarPerfilForm internamente

      inicio: () => <DashboardAdmin />,
      rutas: () => (
        <TabPendiente nombre="Gestión de rutas" icono="map-outline" />
      ),
      crear: () => (
        <TabPendiente nombre="Crear ruta" icono="add-circle-outline" />
      ),
      buses: () => <VehiculosScreen />, //para mostrar los buses
      graficas: () => (
        <TabPendiente nombre="Estadísticas" icono="bar-chart-outline" />
      ),
       crear_Ruta: () => (<Bienvenida onNavegar={(tab) => setTabActivo(tab)} />
      ),
      mapa_colaboradores: () => <MapaColaboradores />,
      configurar_buses: () => <ConfiguracionBuses onNavegar={(tab) => setTabActivo(tab)} />,
      crear_Conductor: () => <ConductoresScreen />,
      crear_Bus: () => <RegistrarVehiculo />,
      

      perfil: () => (
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

      inicio: () => <DashboardConductor />,
      rutas: () => <TabPendiente nombre="Mi Ruta" icono="navigate-outline" />,

      agregar: () => (
        <TabPendiente nombre="Reportar incidente" icono="warning-outline" />
      ),
      bus: () => <MisBusesScreen />,
      //Perfil → ProfileCard que abre EditarPerfilForm internamente

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

      inicio: () => <DashboardUsuario />,
      favoritos: () => (
        <TabPendiente nombre="Favoritos" icono="heart-outline" />
      ),
      rutas: () => <TabPendiente nombre="Rutas" icono="location-outline" />,
      // Perfil → ProfileCard que abre EditarPerfilForm internamente

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

    return componente ? (
      componente()
    ) : (
      <TabPendiente nombre={tabActivo} icono="construct-outline" />
    );
  };


  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  if (mostrarModal && perfil?.rol === 'usuario') {
    return (
      <CajaDireccion
        id={userId}
        onGuardado={() => setMostarModal(false)}
      />
    );
  }


  return (
    <View style={styles.container}>
      {/* ── Header fijo (siempre visible) ──────────────────── */}

      {tabActivo !== "perfil" && tabActivo !== "inicio" && (
        <Header
          titulo={
            HEADER_CONFIGS[perfil?.rol ?? "usuario"][tabActivo]?.titulo ??
            "Inicio"
          }
          subtitulo={
            HEADER_CONFIGS[perfil?.rol ?? "usuario"][tabActivo]?.subtitulo ?? ""
          }
          mode="light"
          iconoDerecha={
            perfil?.rol === "administrador" || perfil?.rol === "conductor" ? (
              <TouchableOpacity onPress={() => setTabActivo("perfil")}>
                <Ionicons name="settings-outline" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            ) : null}
            showBack={tabActivo === "mapa_colaboradores" || tabActivo === "configurar_buses" } 
            onBack={()=>{
              if(tabActivo === 'configurar_buses') setTabActivo('inicio')
              else if(tabActivo === "mapa_colaboradores") setTabActivo("rutas");
              else setTabActivo('inicio')}
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
      {tabActivo !== 'crear_Ruta' && (
        <BottomNavBar
          rol={perfil?.rol ?? 'usuario'}
          initialTab="inicio"
          onTabPress={(key) => setTabActivo(key)}
        />
      )}

    </View>
  );
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