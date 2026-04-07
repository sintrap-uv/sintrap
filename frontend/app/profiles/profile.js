import React, { useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../services/supabase";
import { signOut } from "../../services/auth";
import { getProfile } from "../../services/profileService";
import ProfileCard from "../../components/ProfileCard";
import theme from "../../constants/theme";
import { signOut } from "../../services/auth";

export default function ProfileScreen() {
  const router = useRouter();
 
  const [profile, setProfile] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [serviceActive, setServiceActive] = useState(true);
 
  useEffect(() => {
    // Usamos onAuthStateChange para esperar a que la sesión
    // esté lista antes de cargar el perfil — evita el loading infinito
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!session?.user) {
          // No hay sesión activa → redirigir al login
          router.replace("/login");
          setLoading(false);
          return;
        }
 
        try {
          // Guardamos el email que viene de auth (no está en profiles)
          setUserEmail(session.user.email ?? "");
 
          const { data, error } = await getProfile(session.user.id);
 
          if (error) {
            console.error("Error cargando perfil:", error.message);
            Alert.alert("Error", "No se pudo cargar el perfil.");
            return;
          }
 
          setProfile(data);
        } catch (err) {
          console.error("Error inesperado:", err);
        } finally {
          setLoading(false);
        }
      }
    );
 
    // Limpieza al desmontar el componente
    return () => subscription.unsubscribe();
  }, []);
 
  // ── Logout ──
  const handleLogout = async () => {
<<<<<<< HEAD
  const { error } = await signOut();
  if (!error) {
    router.replace("/login");
  } else {
    Alert.alert("Error", error.message);
  }
};
=======
    const { error } = await signOut();
    if (!error) router.replace("/login");
  };
>>>>>>> 9ad13944e9085c60904a3e3bbcf278bf09068ef5
 
  return (
    <View style={styles.screen}>
      <ProfileCard
        // ── Columnas reales de la tabla profiles en Supabase ──
        name={profile?.nombre ?? ""}
        email={userEmail}                        // viene de auth, no de profiles
        avatarUri={profile?.avatar_url ?? null}
        role={profile?.rol ?? "usuario"}         // rol_tipo: "usuario" | "administrador" | "conductor"
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
})
