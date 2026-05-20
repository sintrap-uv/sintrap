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
import { useRouter, useFocusEffect } from "expo-router";
import { getProfile } from "../../services/profileService";
import ProfileCard from "../../components/ProfileCard";
import theme from "../../constants/theme";
import Header from "../../components/Header";
import {
  getMetricasAdmin,
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
    label: "Conductores Activos",
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
function BarraOcupacion({ porcentaje }) {
  const pct = Math.min(porcentaje ?? 0, 100);
  const barColor = pct >= 90 ? "#EF4444" : pct >= 70 ? "#F97316" : "#22C55E";

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
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [metricas, setMetricas] = useState(null);
  const [alertas, setAlertas] = useState(null);
  const [rutasConTurnos, setRutasConTurnos] = useState([]);
  const [actividad, setActividad] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

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
      const [resMetricas, resActividad] = await Promise.all([
        getMetricasAdmin(),
        getActividadReciente(),
      ]);

      if (resMetricas.success) {
        setMetricas(resMetricas.data.metricas);
        setAlertas(resMetricas.data.alertas);
      }
      if (resActividad.success) setActividad(resActividad.data);

      // Obtener rutas activas
      const { data: rutasData } = await supabase
        .from("rutas")
        .select("*")
        .eq("activa", true)
        .order("numero_ruta");

      // Obtener asignaciones de vehículos por ruta y turno
      const { data: asignaciones } = await supabase
        .from("ruta_horarios")
        .select(`
          ruta_id,
          tipo_turno_id,
          vehiculos!vehiculo_id (
            id,
            placa,
            tipo_vehiculo:tipo_vehiculo_id (
              nombre,
              capacidad_max
            )
          ),
          tipos_turno:tipo_turno_id (
            id,
            nombre,
            hora_inicio,
            hora_fin
          )
        `);

      // Obtener cantidad de usuarios por ruta
      const { data: usuariosPorRuta } = await supabase
        .from("usuario_ruta")
        .select("*");

        const conteoUsuarios = {};
        usuariosPorRuta?.forEach(u => {
      const key = `${u.ruta_id}_${u.turno_id}`;
        conteoUsuarios[key] = (conteoUsuarios[key] || 0) + 1;
      });

      const conteoPorRuta = usuariosPorRuta?.reduce((acc, u) => {
        acc[u.ruta_id] = (acc[u.ruta_id] || 0) + 1;
        return acc;
      }, {});

      const rutasConDetalles = rutasData.map(ruta => {
        const asignacionesRuta = asignaciones?.filter(a => a.ruta_id === ruta.id) || [];
        const totalUsuarios = conteoPorRuta[ruta.id] || 0;
        
        const turnos = asignacionesRuta.map(asig => {
          const capacidad = asig.vehiculos?.tipo_vehiculo?.capacidad_max || 0;
          const usuariosEnTurno = conteoUsuarios[`${ruta.id}_${asig.tipo_turno_id}`] || 0;
          const porcentaje = capacidad > 0 ? Math.round((usuariosEnTurno / capacidad) * 100) : 0;
          
          return {
            id: asig.tipo_turno_id,
            nombre: asig.tipos_turno?.nombre,
            hora_inicio: asig.tipos_turno?.hora_inicio,
            hora_fin: asig.tipos_turno?.hora_fin,
            vehiculo: asig.vehiculos,
            capacidad: capacidad,
            usuariosAsignados: usuariosEnTurno,
            porcentaje: porcentaje,
          };
        });

        return {
          ...ruta,
          turnos,
          totalUsuarios,
        };
      });

      setRutasConTurnos(rutasConDetalles);
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

  useFocusEffect(
    useCallback(() => {
      cargarDatos(true);
    }, [])
  );

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
        onBack={() => setMostrarPerfil(false)}
      />
    );
  }

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
            <Ionicons name="settings-outline" size={36} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contenido}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarDatos(true)}
            colors={[T.Button.primary.background]}
            tintColor={T.Button.primary.background}
          />
        }
      >
        {/* ALERTAS CRÍTICAS */}
        {alertasActivas.length > 0 && (
          <View style={styles.seccion}>
            {alertasActivas.map((alerta, i) => (
              <AlertaBanner
                key={i}
                icono={alerta.icono}
                mensaje={alerta.mensaje}
                tipo={alerta.tipo}
                onPress={() => console.log("Aun no estan los screens")}
              />
            ))}
          </View>
        )}

        {/* ACCIONES RÁPIDAS */}
        {/* ACCIONES RÁPIDAS */}
<View style={styles.seccion}>
  <View style={styles.accionesGrid}>
    <TouchableOpacity
      style={styles.accionBtn}
      onPress={() => router.push("/(admin)/EnviarAviso")}
      activeOpacity={0.8}
    >
      <View style={[styles.accionIcono, { backgroundColor: "#FEF3C7" }]}>
        <MaterialCommunityIcons name="bullhorn" size={26} color="#F59E0B" />
      </View>
      <Text style={styles.accionLabel}>Registrar aviso</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.accionBtn}
      onPress={() => router.push({
        pathname: "/(admin)/Mapa_colaboradores/mapa-Colaboradores",
        params: { returnTo: "acciones_rapidas" }
      })}
      activeOpacity={0.8}
    >
      <View style={[styles.accionIcono, { backgroundColor: "#FEE2E2" }]}>
        <MaterialCommunityIcons name="map-marker-plus" size={26} color="#EF4444" />
      </View>
      <Text style={styles.accionLabel}>Registrar ruta</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.accionBtn}
      onPress={() => router.push("/(admin)/registrar-vehiculo")}
      activeOpacity={0.8}
    >
      <View style={[styles.accionIcono, { backgroundColor: "#DCFCE7" }]}>
        <MaterialCommunityIcons name="bus-side" size={26} color="#22C55E" />
      </View>
      <Text style={styles.accionLabel}>Registrar bus</Text>
    </TouchableOpacity>
  </View>
</View>

        {/* MÉTRICAS */}
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

        {/* OCUPACIÓN POR RUTA */}
        <View style={styles.seccion}>
          <View style={styles.tituloRow}>
            <Text style={styles.tituloSeccion}>Ocupación por ruta</Text>
            {rutasConTurnos.length > 3 && (
              <TouchableOpacity onPress={() => router.push("/(admin)/rutas")}>
                <Text style={styles.verTodasBtn}>Ver todas ({rutasConTurnos.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {cargando ? (
            <ActivityIndicator color={T.Button.primary.background} style={{ marginTop: 12 }} />
          ) : rutasConTurnos.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>Sin rutas activas</Text>
            </View>
          ) : (
            rutasConTurnos.slice(0, 3).map((ruta) => (
              <View key={ruta.id} style={styles.rutaCard}>
                <View style={styles.rutaHeader}>
                  <View style={styles.rutaInfo}>
                    <View style={[styles.rutaDot, { backgroundColor: ruta.color || "#1B5E20" }]} />
                    <Text style={styles.rutaNombre} numberOfLines={1}>
                      Ruta {ruta.numero_ruta} · {ruta.nombre}
                    </Text>
                  </View>
                </View>

                <Text style={styles.turnosTitulo}>Turnos:</Text>

                {ruta.turnos.length > 0 ? (
                  ruta.turnos.map((turno, idx) => {
                    const colorPorcentaje = turno.porcentaje >= 90 ? "#EF4444" : turno.porcentaje >= 70 ? "#F97316" : "#22C55E";
                    
                    return (
                      <View key={idx} style={styles.turnoCard}>
                        <View style={styles.turnoHeader}>
                          <MaterialCommunityIcons name="clock-outline" size={14} color="#6B7280" />
                          <Text style={styles.turnoNombre}>{turno.nombre}</Text>
                          <Text style={styles.turnoHorario}>
                            {turno.hora_inicio?.slice(0,5)} - {turno.hora_fin?.slice(0,5)}
                          </Text>
                        </View>
                        
                        {turno.vehiculo ? (
                          <>
                            <View style={styles.vehiculoInfo}>
                              <MaterialCommunityIcons name="bus" size={14} color={T.Button.primary.background} />
                              <Text style={styles.vehiculoPlaca}>{turno.vehiculo.placa}</Text>
                              <Text style={styles.vehiculoCapacidad}>Cap: {turno.capacidad}</Text>
                            </View>
                            <View style={styles.ocupacionContainer}>
                              <View style={styles.porcentajeRow}>
                                <Text style={styles.porcentajeTexto}>Ocupación:</Text>
                                <View style={styles.barraFondo}>
                                  <View style={[styles.barraRelleno, { width: `${Math.min(turno.porcentaje, 100)}%`, backgroundColor: colorPorcentaje }]} />
                                </View>
                                <Text style={[styles.porcentajeValor, { color: colorPorcentaje }]}>
                                  {turno.porcentaje}%
                                </Text>
                              </View>
                            </View>
                          </>
                        ) : (
                          <Text style={styles.sinVehiculo}>Sin vehículo asignado</Text>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.sinVehiculo}>No hay turnos configurados</Text>
                )}

              </View>
            ))
          )}
        </View>

        {/* ACTIVIDAD RECIENTE */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Actividad reciente</Text>
          {cargando ? (
            <ActivityIndicator color={T.Button.primary.background} style={{ marginTop: 12 }} />
          ) : actividad.length === 0 ? (
            <View style={styles.vacio}>
              <Text style={styles.vacioTexto}>Sin actividad reciente</Text>
            </View>
          ) : (
            actividad.map((item, i) => {
              const cfg = ACTIVIDAD_ICONO[item.tipo] ?? ACTIVIDAD_ICONO.usuario;
              return (
                <View key={i} style={styles.actividadItem}>
                  <View style={[styles.actividadIcono, { backgroundColor: cfg.color + "18" }]}>
                    <MaterialCommunityIcons name={cfg.nombre} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actividadDesc} numberOfLines={1}>{item.descripcion}</Text>
                    <Text style={styles.actividadTiempo}>{tiempoRelativo(item.fecha)}</Text>
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
                  <Text style={styles.turnoActivoLabel}>Turno en curso hoy</Text>
                  <Text style={styles.turnoActivoSub}>
                    {metricas.turnosEnCurso} conductor{metricas.turnosEnCurso > 1 ? "es" : ""} operando
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push("/(admin)/turnos")} style={styles.turnoActivoBtn}>
                <Text style={styles.turnoActivoBtnTexto}>Ver</Text>
                <Ionicons name="chevron-forward" size={14} color={T.Button.primary.background} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  contenido: { padding: 16, paddingBottom: 32, gap: 8 },
  seccion: { marginBottom: 8 },
  tituloSeccion: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  tituloRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  verTodasBtn: {
    color: T.Button.primary.background,
    fontSize: 12,
    fontWeight: "500",
  },
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
  accionesGrid: { flexDirection: "row", gap: 10 },
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
  accionIcono: { width: 52, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  accionLabel: { fontSize: 12, fontWeight: "500", color: T.text.primary, textAlign: "center" },
  metricasGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tarjetaMetrica: { width: "47.5%", borderRadius: 14, padding: 16, gap: 4 },
  tarjetaIconoWrap: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  tarjetaNumero: { fontSize: 28, fontWeight: "700" },
  tarjetaLabel: { fontSize: 12, color: T.text.secondary, fontWeight: "500" },
  
  // Ocupación
  rutaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rutaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rutaInfo: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  rutaDot: { width: 12, height: 12, borderRadius: 6 },
  rutaNombre: { fontSize: 15, fontWeight: "600", color: T.text.primary, flex: 1 },
  usuariosBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  usuariosBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  turnosTitulo: { fontSize: 12, fontWeight: "600", color: T.text.secondary, marginBottom: 8 },
  turnoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
  },
  turnoHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  turnoNombre: { fontSize: 13, fontWeight: "600", color: T.text.primary },
  turnoHorario: { fontSize: 11, color: "#6B7280" },
  vehiculoInfo: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  vehiculoPlaca: { fontSize: 13, fontWeight: "500", color: T.text.primary },
  vehiculoCapacidad: { fontSize: 11, color: "#6B7280" },
  ocupacionContainer: { marginBottom: 6 },
  porcentajeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  porcentajeTexto: { fontSize: 11, color: "#6B7280" },
  barraFondoMini: { flex: 1, height: 4, backgroundColor: "#F1F5F9", borderRadius: 2, overflow: "hidden" },
  barraRellenoMini: { height: 4, borderRadius: 2 },
  porcentajeValor: { fontSize: 11, fontWeight: "600", minWidth: 35, textAlign: "right" },
  sinVehiculo: { fontSize: 11, color: "#EF4444", fontStyle: "italic", marginBottom: 6 },
  
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
  actividadIcono: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
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
  puntoPulso: { width: 12, height: 12, alignItems: "center", justifyContent: "center" },
  puntoVerde: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#22C55E" },
  turnoActivoLabel: { fontSize: 14, fontWeight: "600", color: "#15803D" },
  turnoActivoSub: { fontSize: 12, color: "#4ADE80" },
  turnoActivoBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  turnoActivoBtnTexto: { fontSize: 13, fontWeight: "600", color: T.Button.primary.background },
  
  vacio: { alignItems: "center", padding: 20 },
  vacioTexto: { fontSize: 13, color: T.text.secondary },
  
  barraFondo: { flex: 1, height: 6, backgroundColor: "#F1F5F9", borderRadius: 3, overflow: "hidden" },
  barraRelleno: { height: 6, borderRadius: 3 },
  
  asignarRecursosBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  asignarRecursosBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },

  turnoCardMini: {
  backgroundColor: "#F9FAFB",
  borderRadius: 10,
  padding: 10,
  marginBottom: 8,
},
turnoHeaderMini: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 6,
},
turnoNombreMini: {
  fontSize: 12,
  fontWeight: "600",
  color: T.text.primary,
},
turnoHorarioMini: {
  fontSize: 10,
  color: "#6B7280",
},
vehiculoMini: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  marginBottom: 6,
},
vehiculoPlacaMini: {
  fontSize: 12,
  fontWeight: "500",
  color: T.text.primary,
},
vehiculoCapacidadMini: {
  fontSize: 10,
  color: "#6B7280",
},
progresoMini: {
  marginTop: 4,
},
usuariosMini: {
  fontSize: 10,
  color: "#6B7280",
  marginBottom: 2,
},
barraFondoMini: {
  height: 4,
  backgroundColor: "#F1F5F9",
  borderRadius: 2,
  overflow: "hidden",
  marginBottom: 2,
},
barraRellenoMini: {
  height: 4,
  borderRadius: 2,
},
porcentajeMini: {
  fontSize: 10,
  fontWeight: "600",
  textAlign: "right",
},
sinVehiculoMini: {
  fontSize: 10,
  color: "#EF4444",
  fontStyle: "italic",
},

});
