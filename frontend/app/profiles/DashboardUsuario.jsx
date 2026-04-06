import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../services/supabase";
import theme from "../../constants/theme";
import Header from "../../components/Header";
import {
  getDashboardUsuario,
  calcularETA,
  marcarNotifLeida,
  formatearHora,
} from "../../services/dashboardUsuarioService";

const T = theme.lightMode;

// ─── Íconos por tipo de notificación ──────────────────────────────────────
const NOTIF_CONFIG = {
  bus_aproximandose: { icono: "bus-clock",      color: "#22C55E", bg: "#DCFCE7" },
  bus_pasado:        { icono: "bus-stop",        color: "#F97316", bg: "#FFEDD5" },
  cambio_ruta:       { icono: "road-variant",    color: "#EF4444", bg: "#FEE2E2" },
  ruta_reanudada:    { icono: "check-circle",    color: "#22C55E", bg: "#DCFCE7" },
  alerta_general:    { icono: "information",     color: "#3B82F6", bg: "#DBEAFE" },
  pago:              { icono: "cash",            color: "#8B5CF6", bg: "#EDE9FE" },
  sistema:           { icono: "cog",             color: "#6B7280", bg: "#F3F4F6" },
};

// ─── Componente: chip de estado del bus ───────────────────────────────────
function ChipEstadoBus({ enRuta, etaMinutos }) {
  if (!enRuta) {
    return (
      <View style={[styles.chip, { backgroundColor: "#F3F4F6" }]}>
        <View style={[styles.chipDot, { backgroundColor: "#9CA3AF" }]} />
        <Text style={[styles.chipTexto, { color: "#6B7280" }]}>Sin servicio</Text>
      </View>
    );
  }
  const color = etaMinutos <= 5 ? "#22C55E" : etaMinutos <= 15 ? "#F97316" : "#3B82F6";
  const bg    = etaMinutos <= 5 ? "#DCFCE7" : etaMinutos <= 15 ? "#FFEDD5" : "#DBEAFE";
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <View style={[styles.chipDot, { backgroundColor: color }]} />
      <Text style={[styles.chipTexto, { color }]}>
        {etaMinutos <= 2 ? "Llegando ahora" : `~${etaMinutos} min`}
      </Text>
    </View>
  );
}

// ─── Componente: parada en el recorrido ───────────────────────────────────
function ItemParada({ parada, esOrigen, esDestino, esPasada, esActual }) {
  const colorLinea = esPasada ? "#22C55E" : "#E5E7EB";
  const colorPunto = esPasada ? "#22C55E" : esActual ? "#3B82F6" : esOrigen ? "#22C55E" : esDestino ? "#EF4444" : "#D1D5DB";
  const colorTexto = esActual ? "#1D4ED8" : esPasada ? "#15803D" : "#6B7280";

  return (
    <View style={styles.paradaFila}>
      {/* Línea vertical + punto */}
      <View style={styles.paradaConector}>
        <View style={[styles.paradaPunto, { backgroundColor: colorPunto, borderColor: esActual ? "#BFDBFE" : "transparent", borderWidth: esActual ? 3 : 0 }]} />
        {!esDestino && <View style={[styles.paradaLinea, { backgroundColor: colorLinea }]} />}
      </View>

      {/* Contenido */}
      <View style={styles.paradaContenido}>
        <View style={styles.paradaFila2}>
          <Text style={[styles.paradaNombre, { color: esActual ? "#1D4ED8" : esPasada ? T.text.secondary : T.text.primary, fontWeight: esActual || esOrigen || esDestino ? "600" : "400" }]}>
            {parada.nombre}
          </Text>
          {esOrigen  && <View style={[styles.badge, { backgroundColor: "#DCFCE7" }]}><Text style={[styles.badgeTexto, { color: "#15803D" }]}>Tu parada</Text></View>}
          {esDestino && <View style={[styles.badge, { backgroundColor: "#FEE2E2" }]}><Text style={[styles.badgeTexto, { color: "#991B1B" }]}>Destino</Text></View>}
          {esActual  && <View style={[styles.badge, { backgroundColor: "#DBEAFE" }]}><Text style={[styles.badgeTexto, { color: "#1D4ED8" }]}>🚌 Bus aquí</Text></View>}
        </View>
        {parada.eta > 0 && (
          <Text style={[styles.paradaETA, { color: colorTexto }]}>
            {parada.eta} min desde inicio
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Dashboard principal del usuario ──────────────────────────────────────
export default function DashboardUsuario() {
  const router = useRouter();

  const [userId,      setUserId]      = useState(null);
  const [datos,       setDatos]       = useState(null);
  const [sinRuta,     setSinRuta]     = useState(false);
  const [cargando,    setCargando]    = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  // Obtener el userId del usuario autenticado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setUserId(data.user.id);
    });
  }, []);

  const cargarDatos = useCallback(async (esRefresh = false) => {
    if (!userId) return;
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    try {
      const resultado = await getDashboardUsuario(userId);
      if (resultado.success) {
        if (!resultado.data) { setSinRuta(true); }
        else { setDatos(resultado.data); setSinRuta(false); }
      }
    } catch (e) {
      console.error("Error dashboard usuario:", e.message);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  }, [userId]);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ETA del bus a la parada de origen del usuario
  const etaMinutos = datos?.bus?.ubicacion
    ? calcularETA(datos.bus.ubicacion.distancia_metros, datos.bus.velocidad)
    : null;

  // Parada "actual" del bus (la más cercana según su posición en el recorrido)
  // Simplificado: la parada con orden mayor que ya pasó
  const paradaActualOrden = datos?.bus?.enRuta ? 3 : null; // ajustar con lógica real de posición

  if (cargando) {
    return (
      <View style={styles.root}>
        <Header titulo="Mi ruta" subtitulo="Información de tu servicio" mode="light" />
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={styles.cargandoTexto}>Cargando tu ruta...</Text>
        </View>
      </View>
    );
  }

  if (sinRuta) {
    return (
      <View style={styles.root}>
        <Header titulo="Mi ruta" subtitulo="Información de tu servicio" mode="light" />
        <View style={styles.centrado}>
          <MaterialCommunityIcons name="bus-stop" size={64} color="#D1D5DB" />
          <Text style={styles.sinRutaTitulo}>Sin ruta asignada</Text>
          <Text style={styles.sinRutaSub}>El administrador aún no te ha asignado una ruta de servicio.</Text>
        </View>
      </View>
    );
  }

  const { asignacion, paradas, bus, turnoHoy, notificaciones } = datos;

  return (
    <View style={styles.root}>
      <Header
        titulo="Mi ruta"
        subtitulo={`Ruta ${asignacion.numeroRuta} · ${asignacion.paradaOrigen.nombre}`}
        mode="light"
        iconoDerecha={
          <TouchableOpacity onPress={() => console.log("Ir a la sesion de notificaciones")} style={{ position: "relative" }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {notificaciones.length > 0 && (
              <View style={styles.badgeNotif}>
                <Text style={styles.badgeNotifTexto}>{notificaciones.length}</Text>
              </View>
            )}
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
        {/* ── 1. HERO: ESTADO DEL BUS ─────────────────────────── */}
        <View style={[styles.heroCard, { borderLeftColor: asignacion.color }]}>
          {/* Cabecera */}
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroRutaLabel}>Ruta {asignacion.numeroRuta}</Text>
              <Text style={styles.heroRutaNombre} numberOfLines={1}>
                {asignacion.paradaOrigen.nombre} → {asignacion.paradaDestino.nombre}
              </Text>
            </View>
            <ChipEstadoBus enRuta={bus?.enRuta} etaMinutos={etaMinutos} />
          </View>

          {/* ETA grande */}
          {bus?.enRuta && etaMinutos !== null ? (
            <View style={styles.heroETA}>
              <MaterialCommunityIcons name="bus-side" size={32} color={asignacion.color} />
              <View>
                <Text style={styles.heroETANumero}>{etaMinutos} min</Text>
                <Text style={styles.heroETASub}>hasta tu parada · {bus.placa}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.heroETA}>
              <MaterialCommunityIcons name="bus-off" size={32} color="#9CA3AF" />
              <View>
                <Text style={[styles.heroETANumero, { color: "#9CA3AF" }]}>Sin servicio</Text>
                <Text style={styles.heroETASub}>No hay bus activo en esta ruta</Text>
              </View>
            </View>
          )}

          {/* Datos del bus */}
          {bus && (
            <View style={styles.heroBusDatos}>
              <View style={styles.heroBusDato}>
                <MaterialCommunityIcons name="bus-side" size={14} color={T.text.secondary} />
                <Text style={styles.heroBusDatoTexto}>{bus.tipo ?? "Buseta"}</Text>
              </View>
              <View style={styles.heroBusDato}>
                <MaterialCommunityIcons name="account-group" size={14} color={T.text.secondary} />
                <Text style={styles.heroBusDatoTexto}>
                  {bus.velocidad > 0 ? `${Math.round(bus.velocidad)} km/h` : "Detenido"}
                </Text>
              </View>
              {turnoHoy?.conductor && (
                <View style={styles.heroBusDato}>
                  <Ionicons name="person-outline" size={14} color={T.text.secondary} />
                  <Text style={styles.heroBusDatoTexto}>{turnoHoy.conductor.nombre}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ACCIONES RÁPIDAS  */}
        <View style={styles.accionesRow}>
          <TouchableOpacity
            style={styles.accionCard}
            onPress={() => console.log("Ver en mapa. Aun no esta implementao el screenn")}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#DBEAFE" }]}>
              <MaterialCommunityIcons name="map-search" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.accionTexto}>Ver en mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.accionCard}
            onPress={() => console.log("Reportar: Aun no esta implementado el screen")}
            activeOpacity={0.8}
          >
            <View style={[styles.accionIcono, { backgroundColor: "#FEE2E2" }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#EF4444" />
            </View>
            <Text style={styles.accionTexto}>Reportar</Text>
          </TouchableOpacity>

          {turnoHoy?.conductor?.celular && (
            <TouchableOpacity
              style={styles.accionCard}
              onPress={() => Linking.openURL(`tel:${turnoHoy.conductor.celular}`)}
              activeOpacity={0.8}
            >
              <View style={[styles.accionIcono, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="call-outline" size={22} color="#22C55E" />
              </View>
              <Text style={styles.accionTexto}>Llamar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 3. HORARIO HOY  */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Horario de hoy</Text>
          <View style={styles.horarioCard}>
            <View style={styles.horarioFila}>
              <Ionicons name="time-outline" size={16} color={T.text.secondary} />
              <Text style={styles.horarioTexto}>
                {formatearHora(asignacion.horarioInicio ?? "06:00:00")} — {formatearHora(asignacion.horarioFin ?? "08:00:00")}
              </Text>
              {turnoHoy?.estado === "en_curso" && (
                <View style={[styles.chip, { backgroundColor: "#DCFCE7", marginLeft: "auto" }]}>
                  <View style={[styles.chipDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[styles.chipTexto, { color: "#15803D" }]}>En curso</Text>
                </View>
              )}
            </View>
            {turnoHoy?.conductor && (
              <View style={styles.horarioFila}>
                <Ionicons name="person-outline" size={16} color={T.text.secondary} />
                <Text style={styles.horarioTexto}>
                  Conductor: {turnoHoy.conductor.nombre}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── 4. RECORRIDO DE PARADAS  */}
        <View style={styles.seccion}>
          <Text style={styles.tituloSeccion}>Recorrido</Text>
          <View style={styles.paradasCard}>
            {paradas.map((parada, i) => {
              const esOrigen  = parada.id === asignacion.paradaOrigen.id;
              const esDestino = parada.id === asignacion.paradaDestino.id;
              const esActual  = parada.orden === paradaActualOrden;
              const esPasada  = paradaActualOrden ? parada.orden < paradaActualOrden : false;
              return (
                <ItemParada
                  key={parada.id}
                  parada={parada}
                  esOrigen={esOrigen}
                  esDestino={esDestino}
                  esActual={esActual}
                  esPasada={esPasada}
                />
              );
            })}
          </View>
        </View>

        {/* ── 5. NOTIFICACIONES NO LEÍDAS  */}
        {notificaciones.length > 0 && (
          <View style={styles.seccion}>
            <View style={styles.notifHeader}>
              <Text style={styles.tituloSeccion}>Avisos</Text>
              <TouchableOpacity onPress={() => console.log("Avisos: Aun no esta inmplementado el screen")}>
                <Text style={styles.verTodas}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {notificaciones.map((notif) => {
              const cfg = NOTIF_CONFIG[notif.tipo] ?? NOTIF_CONFIG.sistema;
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={styles.notifItem}
                  activeOpacity={0.8}
                  onPress={() => marcarNotifLeida(notif.id)}
                >
                  <View style={[styles.notifIcono, { backgroundColor: cfg.bg }]}>
                    <MaterialCommunityIcons name={cfg.icono} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.notifTitulo}>{notif.titulo}</Text>
                    <Text style={styles.notifMensaje} numberOfLines={2}>{notif.mensaje}</Text>
                  </View>
                  {!notif.leida && <View style={styles.puntoPendiente} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── Estilos
const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.background },
  scroll:  { flex: 1 },
  contenido: { padding: 16, paddingBottom: 32, gap: 12 },

  centrado: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  cargandoTexto: { fontSize: 14, color: T.text.secondary },

  // Sin ruta
  sinRutaTitulo: { fontSize: 18, fontWeight: "600", color: T.text.primary, textAlign: "center" },
  sinRutaSub:    { fontSize: 14, color: T.text.secondary, textAlign: "center", lineHeight: 20 },

  // Hero card
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
    gap: 14,
  },
  heroHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroRutaLabel: { fontSize: 12, fontWeight: "600", color: T.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  heroRutaNombre:{ fontSize: 15, fontWeight: "700", color: T.text.primary, marginTop: 2, maxWidth: 200 },

  heroETA:       { flexDirection: "row", alignItems: "center", gap: 12 },
  heroETANumero: { fontSize: 26, fontWeight: "700", color: T.text.primary },
  heroETASub:    { fontSize: 12, color: T.text.secondary, marginTop: 2 },

  heroBusDatos:  { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  heroBusDato:   { flexDirection: "row", alignItems: "center", gap: 4 },
  heroBusDatoTexto: { fontSize: 12, color: T.text.secondary },

  // Chip
  chip:      { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  chipDot:   { width: 6, height: 6, borderRadius: 3 },
  chipTexto: { fontSize: 12, fontWeight: "600" },

  // Acciones
  accionesRow: { flexDirection: "row", gap: 10 },
  accionCard: {
    flex: 1, alignItems: "center", backgroundColor: "#fff", borderRadius: 14,
    paddingVertical: 14, gap: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  accionIcono: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  accionTexto: { fontSize: 12, fontWeight: "500", color: T.text.primary },

  // Sección
  seccion:       { gap: 10 },
  tituloSeccion: {
    fontSize: 13, fontWeight: "600", color: T.text.secondary,
    textTransform: "uppercase", letterSpacing: 0.8,
  },

  // Horario
  horarioCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 10,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  horarioFila:  { flexDirection: "row", alignItems: "center", gap: 8 },
  horarioTexto: { fontSize: 14, color: T.text.primary, flex: 1 },

  // Paradas
  paradasCard: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  paradaFila:      { flexDirection: "row", gap: 12, minHeight: 52 },
  paradaConector:  { alignItems: "center", width: 16 },
  paradaPunto:     { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  paradaLinea:     { width: 2, flex: 1, marginTop: 4 },
  paradaContenido: { flex: 1, paddingBottom: 8 },
  paradaFila2:     { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  paradaNombre:    { fontSize: 14, color: T.text.primary },
  paradaETA:       { fontSize: 11, marginTop: 2 },

  // Badge pequeño
  badge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeTexto: { fontSize: 10, fontWeight: "700" },

  // Notif badge en header
  badgeNotif: {
    position: "absolute", top: -4, right: -4,
    backgroundColor: "#EF4444", borderRadius: 8,
    width: 16, height: 16, alignItems: "center", justifyContent: "center",
  },
  badgeNotifTexto: { fontSize: 9, color: "#fff", fontWeight: "700" },

  // Notificaciones
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  verTodas:    { fontSize: 13, color: T.Button.primary.background, fontWeight: "500" },
  notifItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "#fff", borderRadius: 12, padding: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  notifIcono:     { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifTitulo:    { fontSize: 13, fontWeight: "600", color: T.text.primary },
  notifMensaje:   { fontSize: 12, color: T.text.secondary, marginTop: 2, lineHeight: 16 },
  puntoPendiente: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3B82F6" },
});
