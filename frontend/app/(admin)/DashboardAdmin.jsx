import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import { useRouter } from "expo-router";
import { getProfile } from "../../services/profileService";
import ProfileCard from "../../components/ProfileCard";
import theme from "../../constants/theme";
import Header from "../../components/Header";
import {
  getMetricasAdmin,
  getOcupacionRutas,
  getActividadReciente,
  tiempoRelativo,
} from "../../services/dashboardAdminService";

const T = theme.lightMode;

// ─── Configuración de tarjetas de métricas
const METRICAS_CONFIG = [
  {
    key: "busesActivos",
    label: "Buses activos",
    icono: "bus",
    lib: "MaterialCommunityIcons",
    color: "#22C55E",
    bg: "#DCFCE7",
  },
  {
    key: "rutasActivas",
    label: "Rutas activas",
    icono: "map-marker-path",
    lib: "MaterialCommunityIcons",
    color: "#3B82F6",
    bg: "#DBEAFE",
  },
  {
    key: "usuariosActivos",
    label: "Usuarios activos",
    icono: "account-group",
    lib: "MaterialCommunityIcons",
    color: "#F97316",
    bg: "#FFEDD5",
  },
  {
    key: "conductoresActivos",
    label: "Conductores",
    icono: "steering",
    lib: "MaterialCommunityIcons",
    color: "#8B5CF6",
    bg: "#EDE9FE",
  },
];

// ─── Íconos de actividad reciente
const ACTIVIDAD_ICONO = {
  usuario: { nombre: "account-plus", color: "#F97316" },
  conductor: { nombre: "card-account-details", color: "#8B5CF6" },
  bus: { nombre: "bus-side", color: "#22C55E" },
  turno: { nombre: "clock-start", color: "#3B82F6" },
  reporte: { nombre: "alert-circle", color: "#EF4444" },
};

// ─── Componente: barra de progreso de ocupación
function BarraOcupacion({ porcentaje, color }) {
  const pct = Math.min(porcentaje ?? 0, 100);
  const barColor =
    pct >= 90 ? "#EF4444" : pct >= 70 ? "#F97316" : (color ?? "#22C55E");

  return (
    <View style={styles.barraFondo}>
      <View
        style={[
          styles.barraRelleno,
          { width: `${pct}%`, backgroundColor: barColor },
        ]}
      />
    </View>
  );
}

// ─── Componente: alerta crítica
function AlertaBanner({ icono, mensaje, tipo, onPress }) {
  const colores = {
    error: {
      bg: "#FEE2E2",
      border: "#EF4444",
      texto: "#991B1B",
      icon: "#EF4444",
    },
    warning: {
      bg: "#FEF3C7",
      border: "#F59E0B",
      texto: "#92400E",
      icon: "#F59E0B",
    },
  };
  const c = colores[tipo] ?? colores.warning;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.alertaBanner,
        { backgroundColor: c.bg, borderLeftColor: c.border },
      ]}
    >
      <MaterialCommunityIcons name={icono} size={18} color={c.icon} />
      <Text style={[styles.alertaTexto, { color: c.texto }]}>{mensaje}</Text>
      <Ionicons name="chevron-forward" size={16} color={c.icon} />
    </TouchableOpacity>
  );
}

// ─── Componente: tarjeta de métrica
function TarjetaMetrica({ config, valor, cargando }) {
  return (
    <View style={[styles.tarjetaMetrica, { backgroundColor: config.bg }]}>
      <View
        style={[
          styles.tarjetaIconoWrap,
          { backgroundColor: config.color + "22" },
        ]}
      >
        <MaterialCommunityIcons
          name={config.icono}
          size={24}
          color={config.color}
        />
      </View>
      {cargando ? (
        <ActivityIndicator
          size="small"
          color={config.color}
          style={{ marginTop: 10 }}
        />
      ) : (
        <Text style={[styles.tarjetaNumero, { color: config.color }]}>
          {valor ?? 0}
        </Text>
      )}
      <Text style={styles.tarjetaLabel}>{config.label}</Text>
    </View>
  );
}

// ─── Dashboard principal
export default function DashboardAdmin() {
  const router = useRouter();
  // ── Estados del perfil (para ProfileCard)
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");

  // ── Estados del dashboard
  const [metricas, setMetricas] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [ocupacion, setOcupacion] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Carga el perfil del admin autenticado al montar
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

  const cargarDatos = useCallback(async (esRefresh = false) => {
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    try {
      const [resMetricas, resOcupacion, resActividad] = await Promise.all([
        getMetricasAdmin(),
        getOcupacionRutas(),
        getActividadReciente(),
      ]);

      if (resMetricas.success) {
        setMetricas(resMetricas.data.metricas);
        setAlertas(resMetricas.data.alertas);
      }
      if (resOcupacion.success) setOcupacion(resOcupacion.data);
      if (resActividad.success) setActividad(resActividad.data);
    } catch (e) {
      console.error("Error cargando dashboard admin:", e.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Si el admin abrió su perfil, renderiza ProfileCard en lugar del dashboard
  if (mostrarPerfil) {
    return (
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
        onTripHistory={() => {}}
        onNotifications={() => {}}
        onSettings={() => {}}
        onChangePassword={() => {}}
        onLogout={handleLogout}
        onManageUsers={() => {}}
        onReports={() => {}}
        onManageRoutes={() => {}}
        // Botón para volver al dashboard desde ProfileCard
        onBack={() => setMostrarPerfil(false)}
      />
    );
  }

  // Calcula alertas activas para mostrar los banners
  const alertasActivas = alertas
    ? [
        alertas.segurosVencidos > 0 && {
          icono: "shield-alert",
          tipo: "error",
          mensaje: `${alertas.segurosVencidos} vehículo${alertas.segurosVencidos > 1 ? "s" : ""} con seguro vencido`,
          ruta: "/(admin)/vehiculos",
        },
        alertas.segurosPorVencer > 0 && {
          icono: "shield-half-full",
          tipo: "warning",
          mensaje: `${alertas.segurosPorVencer} seguro${alertas.segurosPorVencer > 1 ? "s" : ""} vencen en los próximos 30 días`,
          ruta: "/(admin)/vehiculos",
        },
        alertas.sinSeguro > 0 && {
          icono: "shield-off",
          tipo: "warning",
          mensaje: `${alertas.sinSeguro} bus${alertas.sinSeguro > 1 ? "es" : ""} sin seguro registrado`,
          ruta: "/(admin)/registrado",
        },
      ].filter(Boolean)
    : [];

  return (
    <View style={styles.root}>
      <Header
        titulo="Panel Administrador"
        subtitulo="Gestiona rutas y buses"
        mode="light"
        iconoDerecha={
          <TouchableOpacity onPress={() => setMostrarPerfil(true)}>
            <Ionicons name="settings-outline" size={28} color="#fff" />
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
        {/*  ALERTAS CRÍTICAS */}
        {alertasActivas.length > 0 && (
          <View style={styles.seccion}>
            {alertasActivas.map((alerta, i) => (
              <AlertaBanner
                key={i}
                icono={alerta.icono}
                mensaje={alerta.mensaje}
                tipo={alerta.tipo}
                // onPress={() => router.push(alerta.ruta)}
                onPress={() => console.log("Aun no estan los screens")}
              />
            ))}
          </View>
        )}

        {/* ACCIONES RÁPIDAS */}
        <View style={styles.seccion}>
          <View style={styles.accionesGrid}>
            <TouchableOpacity
              style={styles.accionBtn}
              onPress={() => router.push("/(admin)/EnviarAviso")}
              activeOpacity={0.8}
            >
              <View
                style={[styles.accionIcono, { backgroundColor: "#FEF3C7" }]}
              >
                <MaterialCommunityIcons
                  name="bullhorn"
                  size={26}
                  color="#F59E0B"
                />
              </View>
              <Text style={styles.accionLabel}>Crear aviso</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accionBtn}
              onPress={() => router.push("/(admin)/EnviarAviso")}
              activeOpacity={0.8}
            >
              <View
                style={[styles.accionIcono, { backgroundColor: "#FEE2E2" }]}
              >
                <MaterialCommunityIcons
                  name="map-marker-plus"
                  size={26}
                  color="#EF4444"
                />
              </View>
              <Text style={styles.accionLabel}>Crear ruta</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.accionBtn}
              onPress={() => router.push("/(admin)/registrar-vehiculo")}
              activeOpacity={0.8}
            >
              <View
                style={[styles.accionIcono, { backgroundColor: "#DCFCE7" }]}
              >
                <MaterialCommunityIcons
                  name="bus-side"
                  size={26}
                  color="#22C55E"
                />
              </View>
              <Text style={styles.accionLabel}>Registrar bus</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MÉTRICAS  */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Estadísticas</Text>
          <View style={styles.metricasGrid}>
            {METRICAS_CONFIG.map((config) => (
              <TarjetaMetrica
                key={config.key}
                config={config}
                valor={metricas?.[config.key]}
                cargando={cargando}
              />
            ))}
          </View>
        </View>

        {/* OCUPACIÓN POR RUTA  */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Ocupación por ruta</Text>

          {cargando ? (
            <ActivityIndicator
              color={T.Button.primary.background}
              style={{ marginTop: 12 }}
            />
          ) : ocupacion.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>Sin rutas activas</Text>
            </View>
          ) : (
            ocupacion.map((ruta) => (
              <View key={ruta.id} style={styles.rutaCard}>
                <View style={styles.rutaHeader}>
                  <View style={styles.rutaInfo}>
                    <View
                      style={[styles.rutaDot, { backgroundColor: ruta.color }]}
                    />
                    <Text style={styles.rutaNombre} numberOfLines={1}>
                      Ruta {ruta.numero_ruta} ·{" "}
                      {ruta.nombre.split("—")[1]?.trim() ?? ruta.nombre}
                    </Text>
                  </View>
                  <Text style={styles.rutaContador}>
                    {ruta.asignados}/{ruta.capacidad > 0 ? ruta.capacidad : "–"}
                  </Text>
                </View>
                <BarraOcupacion
                  porcentaje={ruta.porcentaje}
                  color={ruta.color}
                />
                <Text style={styles.rutaPorcentaje}>
                  {ruta.capacidad > 0
                    ? `${ruta.porcentaje}% ocupado · ${ruta.capacidad - ruta.asignados} cupos disponibles`
                    : "Sin vehículo asignado"}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ACTIVIDAD RECIENTE */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Actividad reciente</Text>

          {cargando ? (
            <ActivityIndicator
              color={T.Button.primary.background}
              style={{ marginTop: 12 }}
            />
          ) : actividad.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>Sin actividad reciente</Text>
            </View>
          ) : (
            actividad.map((item, i) => {
              const cfg = ACTIVIDAD_ICONO[item.tipo] ?? ACTIVIDAD_ICONO.usuario;
              return (
                <View key={i} style={styles.actividadItem}>
                  <View
                    style={[
                      styles.actividadIcono,
                      { backgroundColor: cfg.color + "18" },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={cfg.nombre}
                      size={18}
                      color={cfg.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actividadDesc} numberOfLines={1}>
                      {item.descripcion}
                    </Text>
                    <Text style={styles.actividadTiempo}>
                      {tiempoRelativo(item.fecha)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* TURNO ACTIVO HOY */}
        {metricas?.turnosEnCurso > 0 && (
          <View style={styles.seccion}>
            <View style={styles.turnoActivo}>
              <View style={styles.turnoActivoLeft}>
                <View style={styles.puntoPulso}>
                  <View style={styles.puntoVerde} />
                </View>
                <View>
                  <Text style={styles.turnoActivoLabel}>
                    Turno en curso hoy
                  </Text>
                  <Text style={styles.turnoActivoSub}>
                    {metricas.turnosEnCurso} conductor
                    {metricas.turnosEnCurso > 1 ? "es" : ""} operando
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push("/(admin)/turnos")}
                style={styles.turnoActivoBtn}
              >
                <Text style={styles.turnoActivoBtnTexto}>Ver</Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={T.Button.primary.background}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Estilos
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  contenido: { padding: 16, paddingBottom: 32, gap: 8 },

  // Secciones
  seccion: { marginBottom: 8 },
  tituloSeccion: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Alertas
  alertaBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 8,
  },
  alertaTexto: { flex: 1, fontSize: 13, fontWeight: "500" },

  // Acciones rápidas
  accionesGrid: {
    flexDirection: "row",
    gap: 10,
  },
  accionBtn: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  accionIcono: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: T.text.primary,
    textAlign: "center",
  },

  // Métricas
  metricasGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tarjetaMetrica: {
    width: "47.5%",
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  tarjetaIconoWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  tarjetaNumero: { fontSize: 28, fontWeight: "700" },
  tarjetaLabel: { fontSize: 12, color: T.text.secondary, fontWeight: "500" },

  // Ocupación
  rutaCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rutaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  rutaInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  rutaDot: { width: 10, height: 10, borderRadius: 5 },
  rutaNombre: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text.primary,
    flex: 1,
  },
  rutaContador: { fontSize: 13, fontWeight: "700", color: T.text.secondary },
  barraFondo: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
  },
  barraRelleno: { height: 6, borderRadius: 3 },
  rutaPorcentaje: {
    fontSize: 11,
    color: T.text.secondary,
    marginTop: 6,
  },

  // Actividad
  actividadItem: {
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
  actividadIcono: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actividadDesc: { fontSize: 13, fontWeight: "500", color: T.text.primary },
  actividadTiempo: { fontSize: 11, color: T.text.secondary, marginTop: 2 },

  // Turno activo
  turnoActivo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  turnoActivoLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  puntoPulso: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  puntoVerde: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  turnoActivoLabel: { fontSize: 14, fontWeight: "600", color: "#15803D" },
  turnoActivoSub: { fontSize: 12, color: "#4ADE80" },
  turnoActivoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  turnoActivoBtnTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: T.Button.primary.background,
  },

  // Vacío
  vacio: { alignItems: "center", padding: 20 },
  vacioTexto: { fontSize: 13, color: T.text.secondary },
});
