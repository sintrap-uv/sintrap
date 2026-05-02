 import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, StyleSheet, Linking, Image,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import theme from "../../constants/theme";
import Header from "../../components/Header";
import {
  getDashboardUsuario, calcularETA,
  marcarNotifLeida, formatearHora,
} from "../../services/dashboardUsuarioService";

const T = theme.lightMode;

// ─── Config notificaciones ────────────────────────────────────────────────
const NOTIF_CONFIG = {
  bus_aproximandose: { icono: "bus-clock",       color: "#22C55E", bg: "#DCFCE7" },
  bus_pasado:        { icono: "bus-stop",         color: "#F97316", bg: "#FFEDD5" },
  cambio_ruta:       { icono: "road-variant",     color: "#EF4444", bg: "#FEE2E2" },
  ruta_reanudada:    { icono: "check-circle",     color: "#22C55E", bg: "#DCFCE7" },
  alerta_general:    { icono: "information",      color: "#3B82F6", bg: "#DBEAFE" },
  pago:              { icono: "cash",             color: "#8B5CF6", bg: "#EDE9FE" },
  sistema:           { icono: "cog",              color: "#6B7280", bg: "#F3F4F6" },
};

// ─── Config estado del servicio ───────────────────────────────────────────
const ESTADO_CONFIG = {
  en_ruta:       { label: "En ruta",       color: "#16A34A", bg: "#DCFCE7", dot: "#16A34A" },
  proximamente:  { label: "Próximamente",  color: "#D97706", bg: "#FEF3C7", dot: "#D97706" },
  disponible:    { label: "Disponible",    color: "#3B82F6", bg: "#DBEAFE", dot: "#3B82F6" },
  sin_servicio:  { label: "Sin servicio",  color: "#6B7280", bg: "#F3F4F6", dot: "#9CA3AF" },
};

// ─── Chip estado bus ──────────────────────────────────────────────────────
function ChipEstadoBus({ enRuta, etaMinutos }) {
  if (!enRuta) return (
    <View style={[s.chip, { backgroundColor: "#F3F4F6" }]}>
      <View style={[s.chipDot, { backgroundColor: "#9CA3AF" }]} />
      <Text style={[s.chipTexto, { color: "#6B7280" }]}>Sin servicio</Text>
    </View>
  );
  const color = etaMinutos <= 5 ? "#22C55E" : etaMinutos <= 15 ? "#F97316" : "#3B82F6";
  const bg    = etaMinutos <= 5 ? "#DCFCE7" : etaMinutos <= 15 ? "#FFEDD5" : "#DBEAFE";
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <View style={[s.chipDot, { backgroundColor: color }]} />
      <Text style={[s.chipTexto, { color }]}>
        {etaMinutos <= 2 ? "Llegando ahora" : `~${etaMinutos} min`}
      </Text>
    </View>
  );
}

// ─── Parada en recorrido ──────────────────────────────────────────────────
function ItemParada({ parada, esOrigen, esDestino, esPasada, esActual }) {
  const colorPunto = esPasada ? "#22C55E" : esActual ? "#3B82F6" : esOrigen ? "#22C55E" : esDestino ? "#EF4444" : "#D1D5DB";
  const colorLinea = esPasada ? "#22C55E" : "#E5E7EB";
  return (
    <View style={s.paradaFila}>
      <View style={s.paradaConector}>
        <View style={[s.paradaPunto, { backgroundColor: colorPunto, borderColor: esActual ? "#BFDBFE" : "transparent", borderWidth: esActual ? 3 : 0 }]} />
        {!esDestino && <View style={[s.paradaLinea, { backgroundColor: colorLinea }]} />}
      </View>
      <View style={s.paradaContenido}>
        <View style={s.paradaFila2}>
          <Text style={[s.paradaNombre, { color: esActual ? "#1D4ED8" : esPasada ? T.text.secondary : T.text.primary, fontWeight: esActual || esOrigen || esDestino ? "600" : "400" }]}>
            {parada.nombre}
          </Text>
          {esOrigen  && <View style={[s.badge, { backgroundColor: "#DCFCE7" }]}><Text style={[s.badgeTexto, { color: "#15803D" }]}>Tu parada</Text></View>}
          {esDestino && <View style={[s.badge, { backgroundColor: "#FEE2E2" }]}><Text style={[s.badgeTexto, { color: "#991B1B" }]}>Destino</Text></View>}
          {esActual  && <View style={[s.badge, { backgroundColor: "#DBEAFE" }]}><Text style={[s.badgeTexto, { color: "#1D4ED8" }]}>🚌 Bus aquí</Text></View>}
        </View>
        {parada.eta > 0 && <Text style={[s.paradaETA, { color: "#9CA3AF" }]}>{parada.eta} min desde inicio</Text>}
      </View>
    </View>
  );
}

// ─── Tarjeta de vehículo y conductor ─────────────────────────────────────
function TarjetaVehiculo({ bus, turnoHoy }) {
  if (!bus) {
    return (
      <View style={s.vehiculoCard}>
        <View style={s.vehiculoHeader}>
          <Ionicons name="bus-outline" size={18} color={T.text.secondary} />
          <Text style={s.vehiculoTitulo}>Vehículo asignado</Text>
        </View>
        <View style={s.vehiculoVacio}>
          <Ionicons name="bus-outline" size={36} color={T.cards.border} />
          <Text style={s.vehiculoVacioTexto}>Vehículo aún no asignado</Text>
        </View>
      </View>
    );
  }

  const estadoCfg = ESTADO_CONFIG[bus.estadoServicio] ?? ESTADO_CONFIG.sin_servicio;
  const conductor = turnoHoy?.conductor ?? bus.conductor ?? null;
  const enCurso   = turnoHoy?.estado === "en_curso";

  // Porcentaje de ocupación
  const pctOcupacion = bus.capacidad > 0
    ? Math.min(100, Math.round(((bus.capacidad - bus.asientosDisponibles) / bus.capacidad) * 100))
    : 0;
  const colorBarra = pctOcupacion >= 90 ? "#EF4444" : pctOcupacion >= 70 ? "#F97316" : "#22C55E";

  return (
    <View style={s.vehiculoCard}>
      {/* Cabecera */}
      <View style={s.vehiculoHeader}>
        <Ionicons name="bus-outline" size={18} color={T.text.secondary} />
        <Text style={s.vehiculoTitulo}>Vehículo asignado</Text>
        {/* Chip estado */}
        <View style={[s.chip, { backgroundColor: estadoCfg.bg, marginLeft: "auto" }]}>
          <View style={[s.chipDot, { backgroundColor: estadoCfg.dot }]} />
          <Text style={[s.chipTexto, { color: estadoCfg.color }]}>{estadoCfg.label}</Text>
        </View>
      </View>

      {/* Placa grande */}
      <View style={s.placaWrap}>
        <Text style={s.placaTexto}>{bus.placa}</Text>
      </View>

      {/* Info vehículo */}
      <View style={s.vehiculoInfo}>
        <View style={s.vehiculoInfoRow}>
          <View style={[s.infoIconCircle, { backgroundColor: "#EFF6FF" }]}>
            <Ionicons name="car-outline" size={16} color="#3B82F6" />
          </View>
          <View>
            <Text style={s.infoLabel}>Tipo</Text>
            <Text style={s.infoValue}>{bus.tipo}</Text>
          </View>
        </View>

        <View style={s.vehiculoInfoRow}>
          <View style={[s.infoIconCircle, { backgroundColor: "#F0FDF4" }]}>
            <Ionicons name="people-outline" size={16} color="#16A34A" />
          </View>
          <View>
            <Text style={s.infoLabel}>Capacidad</Text>
            <Text style={s.infoValue}>{bus.capacidad} pasajeros</Text>
          </View>
        </View>

        <View style={s.vehiculoInfoRow}>
          <View style={[s.infoIconCircle, { backgroundColor: bus.asientosDisponibles > 0 ? "#F0FDF4" : "#FEF2F2" }]}>
            <Ionicons
              name="ticket-outline"
              size={16}
              color={bus.asientosDisponibles > 0 ? "#16A34A" : "#EF4444"}
            />
          </View>
          <View>
            <Text style={s.infoLabel}>Disponibles</Text>
            <Text style={[s.infoValue, { color: bus.asientosDisponibles > 0 ? "#16A34A" : "#EF4444" }]}>
              {bus.asientosDisponibles} de {bus.capacidad}
            </Text>
          </View>
        </View>
      </View>

      {/* Barra de ocupación */}
      <View>
        <View style={s.barraHeader}>
          <Text style={s.barraLabel}>Ocupación</Text>
          <Text style={[s.barraLabel, { color: colorBarra, fontWeight: "600" }]}>{pctOcupacion}%</Text>
        </View>
        <View style={s.barraFondo}>
          <View style={[s.barraRelleno, { width: `${pctOcupacion}%`, backgroundColor: colorBarra }]} />
        </View>
      </View>

      {/* Divisor */}
      <View style={s.divisor} />

      {/* Conductor */}
      {conductor ? (
        <View style={s.conductorWrap}>
          {/* Avatar */}
          {conductor.avatar_url ? (
            <Image source={{ uri: conductor.avatar_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Ionicons name="person-outline" size={22} color={T.text.secondary} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text style={s.conductorNombre}>{conductor.nombre}</Text>
            {conductor.cedula && (
              <Text style={s.conductorCedula}>CC {conductor.cedula}</Text>
            )}
          </View>

          {/* Botón llamar — solo si el turno está en curso */}
          {enCurso && conductor.celular && (
            <View style={s.contactoBtns}>
              <TouchableOpacity
                style={s.btnContacto}
                onPress={() => Linking.openURL(`tel:${conductor.celular}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={18} color="#16A34A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btnContacto, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}
                onPress={() => Linking.openURL(`whatsapp://send?phone=${conductor.celular}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#16A34A" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={s.conductorVacio}>
          <Ionicons name="person-outline" size={20} color={T.text.secondary} />
          <Text style={s.conductorVacioTexto}>Conductor por asignar</Text>
        </View>
      )}
    </View>
  );
}

// ─── Dashboard principal ──────────────────────────────────────────────────
export default function DashboardUsuario() {
  const [userId,      setUserId]      = useState(null);
  const [datos,       setDatos]       = useState(null);
  const [sinRuta,     setSinRuta]     = useState(false);
  const [cargando,    setCargando]    = useState(true);
  const [refrescando, setRefrescando] = useState(false);

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
        if (!resultado.data) setSinRuta(true);
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

  const etaMinutos = datos?.bus?.ubicacion
    ? calcularETA(datos.bus.ubicacion.distancia_metros, datos.bus.velocidad)
    : null;

  const paradaActualOrden = datos?.bus?.enRuta ? 3 : null;

  if (cargando) {
    return (
      <View style={s.root}>
        <Header titulo="Mi ruta" subtitulo="Información de tu servicio" mode="light" />
        <View style={s.centrado}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={s.cargandoTexto}>Cargando tu ruta...</Text>
        </View>
      </View>
    );
  }

  if (sinRuta) {
    return (
      <View style={s.root}>
        <Header titulo="Mi ruta" subtitulo="Información de tu servicio" mode="light" />
        <View style={s.centrado}>
          <MaterialCommunityIcons name="bus-stop" size={64} color="#D1D5DB" />
          <Text style={s.sinRutaTitulo}>Sin ruta asignada</Text>
          <Text style={s.sinRutaSub}>El administrador aún no te ha asignado una ruta de servicio.</Text>
        </View>
      </View>
    );
  }

  const { asignacion, paradas, bus, turnoHoy, notificaciones } = datos;

  return (
    <View style={s.root}>
      <Header
        titulo="Mi ruta"
        subtitulo={`Ruta ${asignacion.numeroRuta} · ${asignacion.paradaOrigen.nombre}`}
        mode="light"
        iconoDerecha={
          <TouchableOpacity onPress={() => console.log("Notificaciones")} style={{ position: "relative" }}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {notificaciones.length > 0 && (
              <View style={s.badgeNotif}>
                <Text style={s.badgeNotifTexto}>{notificaciones.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.contenido}
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
        <View style={[s.heroCard, { borderLeftColor: asignacion.color }]}>
          <View style={s.heroHeader}>
            <View>
              <Text style={s.heroRutaLabel}>Ruta {asignacion.numeroRuta}</Text>
              <Text style={s.heroRutaNombre} numberOfLines={1}>
                {asignacion.paradaOrigen.nombre} → {asignacion.paradaDestino.nombre}
              </Text>
            </View>
            <ChipEstadoBus enRuta={bus?.enRuta} etaMinutos={etaMinutos} />
          </View>

          {bus?.enRuta && etaMinutos !== null ? (
            <View style={s.heroETA}>
              <MaterialCommunityIcons name="bus-side" size={32} color={asignacion.color} />
              <View>
                <Text style={s.heroETANumero}>{etaMinutos} min</Text>
                <Text style={s.heroETASub}>hasta tu parada · {bus.placa}</Text>
              </View>
            </View>
          ) : (
            <View style={s.heroETA}>
              <MaterialCommunityIcons name="bus-off" size={32} color="#9CA3AF" />
              <View>
                <Text style={[s.heroETANumero, { color: "#9CA3AF" }]}>Sin servicio</Text>
                <Text style={s.heroETASub}>No hay bus activo en esta ruta</Text>
              </View>
            </View>
          )}

          {bus && (
            <View style={s.heroBusDatos}>
              <View style={s.heroBusDato}>
                <MaterialCommunityIcons name="bus-side" size={14} color={T.text.secondary} />
                <Text style={s.heroBusDatoTexto}>{bus.tipo ?? "Buseta"}</Text>
              </View>
              <View style={s.heroBusDato}>
                <MaterialCommunityIcons name="account-group" size={14} color={T.text.secondary} />
                <Text style={s.heroBusDatoTexto}>
                  {bus.velocidad > 0 ? `${Math.round(bus.velocidad)} km/h` : "Detenido"}
                </Text>
              </View>
              {turnoHoy?.conductor && (
                <View style={s.heroBusDato}>
                  <Ionicons name="person-outline" size={14} color={T.text.secondary} />
                  <Text style={s.heroBusDatoTexto}>{turnoHoy.conductor.nombre}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── 2. ACCIONES RÁPIDAS ─────────────────────────────── */}
        <View style={s.accionesRow}>
          <TouchableOpacity style={s.accionCard} activeOpacity={0.8}
            onPress={() => console.log("Ver en mapa")}>
            <View style={[s.accionIcono, { backgroundColor: "#DBEAFE" }]}>
              <MaterialCommunityIcons name="map-search" size={22} color="#3B82F6" />
            </View>
            <Text style={s.accionTexto}>Ver en mapa</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.accionCard} activeOpacity={0.8}
            onPress={() => console.log("Reportar")}>
            <View style={[s.accionIcono, { backgroundColor: "#FEE2E2" }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#EF4444" />
            </View>
            <Text style={s.accionTexto}>Reportar</Text>
          </TouchableOpacity>

          {turnoHoy?.conductor?.celular && (
            <TouchableOpacity style={s.accionCard} activeOpacity={0.8}
              onPress={() => Linking.openURL(`tel:${turnoHoy.conductor.celular}`)}>
              <View style={[s.accionIcono, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="call-outline" size={22} color="#22C55E" />
              </View>
              <Text style={s.accionTexto}>Llamar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── 3. TARJETA DEL VEHÍCULO ─────────────────────────── */}
        <View style={s.seccion}>
          <TarjetaVehiculo bus={bus} turnoHoy={turnoHoy} />
        </View>

        {/* ── 4. HORARIO HOY ──────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.tituloSeccion}>Horario de hoy</Text>
          <View style={s.horarioCard}>
            <View style={s.horarioFila}>
              <Ionicons name="time-outline" size={16} color={T.text.secondary} />
              <Text style={s.horarioTexto}>
                {formatearHora(asignacion.horarioInicio ?? "06:00:00")} — {formatearHora(asignacion.horarioFin ?? "08:00:00")}
              </Text>
              {turnoHoy?.estado === "en_curso" && (
                <View style={[s.chip, { backgroundColor: "#DCFCE7", marginLeft: "auto" }]}>
                  <View style={[s.chipDot, { backgroundColor: "#22C55E" }]} />
                  <Text style={[s.chipTexto, { color: "#15803D" }]}>En curso</Text>
                </View>
              )}
            </View>
            {turnoHoy?.conductor && (
              <View style={s.horarioFila}>
                <Ionicons name="person-outline" size={16} color={T.text.secondary} />
                <Text style={s.horarioTexto}>Conductor: {turnoHoy.conductor.nombre}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── 5. RECORRIDO ────────────────────────────────────── */}
        <View style={s.seccion}>
          <Text style={s.tituloSeccion}>Recorrido</Text>
          <View style={s.paradasCard}>
            {paradas.map((parada, i) => (
              <ItemParada
                key={parada.id}
                parada={parada}
                esOrigen={parada.id === asignacion.paradaOrigen.id}
                esDestino={parada.id === asignacion.paradaDestino.id}
                esActual={parada.orden === paradaActualOrden}
                esPasada={paradaActualOrden ? parada.orden < paradaActualOrden : false}
              />
            ))}
          </View>
        </View>

        
                {/* ── 6. NOTIFICACIONES ───────────────────────────────── */}
        {notificaciones.length > 0 && (
          <View style={s.seccion}>
            <View style={s.notifHeader}>
              <Text style={s.tituloSeccion}>Avisos</Text>
              <TouchableOpacity onPress={() => console.log("Ver todas")}>
                <Text style={s.verTodas}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            {notificaciones.map((notif) => {
              const cfg = NOTIF_CONFIG[notif.tipo] ?? NOTIF_CONFIG.sistema;
              return (
                <TouchableOpacity key={notif.id} style={s.notifItem} activeOpacity={0.8}
                  onPress={() => marcarNotifLeida(notif.id)}>
                  <View style={[s.notifIcono, { backgroundColor: cfg.bg }]}>
                    <MaterialCommunityIcons name={cfg.icono} size={18} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.notifTitulo}>{notif.titulo}</Text>
                    <Text style={s.notifMensaje} numberOfLines={2}>{notif.mensaje}</Text>
                  </View>
                  {!notif.leida && <View style={s.puntoPendiente} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: T.background },
  scroll:    { flex: 1 },
  contenido: { padding: 16, paddingBottom: 32, gap: 12 },

  centrado:      { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  cargandoTexto: { fontSize: 14, color: T.text.secondary },
  sinRutaTitulo: { fontSize: 18, fontWeight: "600", color: T.text.primary, textAlign: "center" },
  sinRutaSub:    { fontSize: 14, color: T.text.secondary, textAlign: "center", lineHeight: 20 },

  // Hero
  heroCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, borderLeftWidth: 4,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3, gap: 14,
  },
  heroHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  heroRutaLabel:    { fontSize: 12, fontWeight: "600", color: T.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },
  heroRutaNombre:   { fontSize: 15, fontWeight: "700", color: T.text.primary, marginTop: 2, maxWidth: 200 },
  heroETA:          { flexDirection: "row", alignItems: "center", gap: 12 },
  heroETANumero:    { fontSize: 26, fontWeight: "700", color: T.text.primary },
  heroETASub:       { fontSize: 12, color: T.text.secondary, marginTop: 2 },
  heroBusDatos:     { flexDirection: "row", gap: 16, flexWrap: "wrap" },
  heroBusDato:      { flexDirection: "row", alignItems: "center", gap: 4 },
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
  tituloSeccion: { fontSize: 13, fontWeight: "600", color: T.text.secondary, textTransform: "uppercase", letterSpacing: 0.8 },

  // ── Tarjeta vehículo ──────────────────────────────────────────────────
  vehiculoCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 16, gap: 14,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
  },
  vehiculoHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  vehiculoTitulo: { fontSize: 13, fontWeight: "600", color: T.text.secondary, textTransform: "uppercase", letterSpacing: 0.5 },

  // Placa
  placaWrap:  { alignItems: "center", paddingVertical: 8 },
  placaTexto: { fontSize: 32, fontWeight: "800", color: T.text.primary, letterSpacing: 4 },

  // Info vehículo
  vehiculoInfo:    { gap: 10 },
  vehiculoInfoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoIconCircle:  { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  infoLabel:       { fontSize: 11, color: T.text.tertiary, textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue:       { fontSize: 14, fontWeight: "600", color: T.text.primary, marginTop: 1 },

  // Barra ocupación
  barraHeader:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barraLabel:   { fontSize: 12, color: T.text.secondary },
  barraFondo:   { height: 8, backgroundColor: "#F1F5F9", borderRadius: 4, overflow: "hidden" },
  barraRelleno: { height: 8, borderRadius: 4 },

  // Divisor
  divisor: { height: 1, backgroundColor: T.cards.border },

  // Conductor
  conductorWrap:      { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar:             { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9" },
  avatarPlaceholder:  { width: 48, height: 48, borderRadius: 24, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  conductorNombre:    { fontSize: 15, fontWeight: "700", color: T.text.primary },
  conductorCedula:    { fontSize: 12, color: T.text.secondary, marginTop: 2 },
  contactoBtns:       { flexDirection: "row", gap: 8 },
  btnContacto:        { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F0FDF4", borderWidth: 1, borderColor: "#86EFAC", alignItems: "center", justifyContent: "center" },
  conductorVacio:     { flexDirection: "row", alignItems: "center", gap: 8 },
  conductorVacioTexto:{ fontSize: 13, color: T.text.secondary },
  vehiculoVacio:      { alignItems: "center", paddingVertical: 20, gap: 8 },
  vehiculoVacioTexto: { fontSize: 13, color: T.text.secondary },

  // Horario
  horarioCard:  { backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  horarioFila:  { flexDirection: "row", alignItems: "center", gap: 8 },
  horarioTexto: { fontSize: 14, color: T.text.primary, flex: 1 },

  // Paradas
  paradasCard:     { backgroundColor: "#fff", borderRadius: 12, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  paradaFila:      { flexDirection: "row", gap: 12, minHeight: 52 },
  paradaConector:  { alignItems: "center", width: 16 },
  paradaPunto:     { width: 12, height: 12, borderRadius: 6, zIndex: 1 },
  paradaLinea:     { width: 2, flex: 1, marginTop: 4 },
  paradaContenido: { flex: 1, paddingBottom: 8 },
  paradaFila2:     { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  paradaNombre:    { fontSize: 14, color: T.text.primary },
  paradaETA:       { fontSize: 11, marginTop: 2 },

  // Badge
  badge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeTexto: { fontSize: 10, fontWeight: "700" },

  // Notif badge header
  badgeNotif:      { position: "absolute", top: -4, right: -4, backgroundColor: "#EF4444", borderRadius: 8, width: 16, height: 16, alignItems: "center", justifyContent: "center" },
  badgeNotifTexto: { fontSize: 9, color: "#fff", fontWeight: "700" },

  // Notificaciones
  notifHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  verTodas:    { fontSize: 13, color: T.Button.primary.background, fontWeight: "500" },
  notifItem:   { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  notifIcono:  { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  notifTitulo: { fontSize: 13, fontWeight: "600", color: T.text.primary },
  notifMensaje:{ fontSize: 12, color: T.text.secondary, marginTop: 2 },
  puntoPendiente: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" },
});