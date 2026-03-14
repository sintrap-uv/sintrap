import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../services/supabase";
import { getProfile } from "../../services/profileService";
import ProfileCard from "../../components/ProfileCard";
import theme from "../../constants/theme";

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serviceActive, setServiceActive] = useState(true);

  // ── Cargar perfil desde Supabase ──
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await getProfile(user.id);

        if (error) {
          console.error("Error al cargar perfil:", error.message);
          Alert.alert("Error", "No se pudo cargar el perfil.");
          return;
        }

        setProfile(data);
      } catch (err) {
        console.error("Error inesperado:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // ── Logout ──
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  return (
    <View style={styles.screen}>
      <ProfileCard
        // ── Columnas reales de la tabla profiles en Supabase ──
        name={profile?.nombre ?? ""}
        email={profile?.email ?? ""}
        avatarUri={profile?.avatar_url ?? null}
        role={profile?.rol ?? "usuario"}       // rol_tipo: "usuario" | "administrador" | "conductor"
        isActive={profile?.activo ?? true}
        loading={loading}

        // ── Actividad ──
        onTripHistory={() => router.push("/trip-history")}
        onNotifications={() => router.push("/notifications")}

        // ── Cuenta ──
        onEditProfile={() => router.push("/profiles/update")}
        onSettings={() => router.push("/settings")}

        // ── Seguridad ──
        onChangePassword={() => router.push("/profiles/forgotPassword")}
        onLogout={handleLogout}

        // ── Solo administrador ──
        onManageUsers={() => router.push("/admin/users")}
        onReports={() => router.push("/admin/reports")}
        onManageRoutes={() => router.push("/admin/routes")}

        // ── Solo conductor ──
        onMyVehicle={() => router.push("/conductor/vehicle")}
        onAssignedRoutes={() => router.push("/conductor/routes")}
        serviceActive={serviceActive}
        onToggleService={() => setServiceActive((prev) => !prev)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.lightMode.background,
  },
});
