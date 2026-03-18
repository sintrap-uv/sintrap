import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import theme from "../constants/theme";
import EditarPerfilForm from "./forms/EditarPerfilForm";
import Header from "./Header"; // ← usa el Header del proyecto

const t = theme.lightMode;

const cardShadow = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 4,
};

const ProfileCard = ({
  name = "Nombre",
  email = "",
  avatarUri = null,
  role = "usuario",
  loading = false,
  isActive = true,
  perfilInicial = null,
  userId = null,
  onGuardado,
  onTripHistory,
  onNotifications,
  onSettings,
  onChangePassword,
  onLogout,
  onManageUsers,
  onReports,
  onManageRoutes,
  onMyVehicle,
  onAssignedRoutes,
  onToggleService,
  serviceActive = true,
}) => {

  const [mostrarEditar, setMostrarEditar] = useState(false);

  const roleConfig = {
    usuario: {
      label: isActive ? "Usuario activo" : "Usuario inactivo",
      badgeBg:   isActive ? "#DCFCE7" : "#FEE2E2",
      badgeText: isActive ? "#16A34A" : "#DC2626",
    },
    administrador: {
      label: "Administrador",
      badgeBg: "#DBEAFE",
      badgeText: "#2563EB",
    },
    conductor: {
      label: "Conductor",
      badgeBg: "#FEF3C7",
      badgeText: "#D97706",
    },
  }[role] ?? {
    label: role,
    badgeBg: "#F1F5F9",
    badgeText: "#475569",
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={t.icon.active} />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // ── volverBtn eliminado — la flecha está en el Header de EditarPerfilForm
  if (mostrarEditar) {
    return (
      <View style={{ flex: 1 }}>
        <EditarPerfilForm
          perfilInicial={perfilInicial}
          userId={userId}
          onGuardado={(actualizado) => {
            onGuardado?.(actualizado);
            setMostrarEditar(false);
          }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* ── Header del proyecto + avatar sobresaliendo ── */}
      <View style={styles.headerContainer}>
        <Header titulo="" subtitulo="" mode="light" />
        {/* Avatar encima del header sobresaliendo */}
        <View style={styles.avatarWrapper}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={46} color="#fff" />
            </View>
          )}
        </View>
      </View>

      {/* ── Info del usuario ── */}
      <View style={styles.profileInfo}>
        <Text style={styles.name}>{name}</Text>
        <View style={[styles.badgeContainer, { backgroundColor: roleConfig.badgeBg }]}>
          <Text style={[styles.badgeText, { color: roleConfig.badgeText }]}>
            {roleConfig.label}
          </Text>
        </View>
        {email ? <Text style={styles.email}>{email}</Text> : null}
      </View>

      {/* ══ SOLO ADMINISTRADOR ══ */}
      {role === "administrador" && (
        <>
          <Text style={styles.sectionTitle}>Administración</Text>
          <View style={styles.card}>
            <MenuItem
              icon={<Ionicons name="people-outline" size={22} color="#2563EB" />}
              label="Gestión de usuarios"
              onPress={onManageUsers}
            />
            <Divider />
            <MenuItem
              icon={<Ionicons name="bar-chart-outline" size={22} color="#2563EB" />}
              label="Reportes"
              onPress={onReports}
            />
            <Divider />
            <MenuItem
              icon={<MaterialCommunityIcons name="map-marker-path" size={22} color="#2563EB" />}
              label="Gestión de rutas"
              onPress={onManageRoutes}
            />
          </View>
        </>
      )}

      {/* ══ SOLO CONDUCTOR ══ */}
      {role === "conductor" && (
        <>
          <Text style={styles.sectionTitle}>Mi servicio</Text>
          <View style={styles.card}>
            <MenuItem
              icon={<Ionicons name="bus-outline" size={22} color="#D97706" />}
              label="Mi vehículo"
              onPress={onMyVehicle}
            />
            <Divider />
            <MenuItem
              icon={<MaterialCommunityIcons name="map-marker-path" size={22} color="#D97706" />}
              label="Rutas asignadas"
              onPress={onAssignedRoutes}
            />
            <Divider />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={onToggleService}
              activeOpacity={0.6}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={serviceActive ? "checkmark-circle-outline" : "close-circle-outline"}
                  size={22}
                  color={serviceActive ? t.icon.active : t.icon.error}
                />
              </View>
              <Text style={styles.menuLabel}>
                Estado:{" "}
                <Text style={{ color: serviceActive ? t.icon.active : t.icon.error, fontWeight: "600" }}>
                  {serviceActive ? "En servicio" : "Fuera de servicio"}
                </Text>
              </Text>
              <Ionicons name="chevron-forward" size={20} color={t.icon.default} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ══ ACTIVIDAD ══ */}
      <Text style={styles.sectionTitle}>Actividad</Text>
      <View style={styles.card}>
        <MenuItem
          icon={<Ionicons name="bus-outline" size={22} color={t.icon.active} />}
          label="Historial de viajes"
          onPress={onTripHistory}
        />
        <Divider />
        <MenuItem
          icon={<Ionicons name="notifications-outline" size={22} color={t.icon.alert} />}
          label="Notificaciones"
          onPress={onNotifications}
        />
      </View>

      {/* ══ CUENTA ══ */}
      <Text style={styles.sectionTitle}>Cuenta</Text>
      <View style={styles.card}>
        <MenuItem
          icon={<Ionicons name="person-outline" size={22} color={t.icon.active} />}
          label="Editar perfil"
          onPress={() => setMostrarEditar(true)}
        />
        <Divider />
        <MenuItem
          icon={<Ionicons name="settings-outline" size={22} color={t.icon.default} />}
          label="Configuración"
          onPress={onSettings}
        />
      </View>

      {/* ══ SEGURIDAD ══ */}
      <Text style={styles.sectionTitle}>Seguridad</Text>
      <View style={styles.card}>
        <MenuItem
          icon={<Ionicons name="lock-closed-outline" size={22} color={t.icon.active} />}
          label="Cambiar contraseña"
          onPress={onChangePassword}
        />
        <Divider />
        <MenuItem
          icon={<MaterialCommunityIcons name="logout" size={22} color={t.icon.error} />}
          label="Cerrar sesión"
          onPress={onLogout}
          labelStyle={{ color: t.icon.error }}
        />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const MenuItem = ({ icon, label, onPress, labelStyle }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.6}>
    <View style={styles.iconContainer}>{icon}</View>
    <Text style={[styles.menuLabel, labelStyle]}>{label}</Text>
    <Ionicons name="chevron-forward" size={20} color={t.icon.default} />
  </TouchableOpacity>
);

const Divider = () => <View style={styles.divider} />;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: t.background,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: t.text.secondary,
  },
  // ── Header container ──
  headerContainer: {
    position: "relative",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "absolute",
    bottom: -50,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#fff",
    ...cardShadow,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#16A34A",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    alignItems: "center",
    marginTop: 62,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  name: {
    fontSize: 22,
    fontWeight: "700",
    color: t.text.primary,
    letterSpacing: 0.3,
  },
  badgeContainer: {
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: { fontSize: 13, fontWeight: "500" },
  email: { marginTop: 8, fontSize: 14, color: t.text.tertiary },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: t.text.secondary,
    marginTop: 20,
    marginBottom: 8,
    marginHorizontal: 20,
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: t.cards.background,
    borderRadius: t.cards.borderRadius,
    marginHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: t.cards.border,
    ...cardShadow,
  },
  divider: {
    height: 1,
    backgroundColor: t.cards.border,
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  iconContainer: {
    width: 30,
    alignItems: "center",
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: t.text.primary,
    fontWeight: "400",
  },
});

export default ProfileCard;