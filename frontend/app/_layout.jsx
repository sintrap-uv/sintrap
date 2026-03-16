/**
 * Responsabilidades:
 *   1. Escuchar cambios de sesión de Supabase (onAuthStateChange)
 *   2. Redirigir automáticamente según si hay sesión activa o no
 *   3. Redirigir según el ROL del usuario (conductor → /home, etc.)
 *
 * Así funciona la persistencia:
 *   - Supabase guarda el token en el dispositivo automáticamente.
 *   - Al reabrir la app, onAuthStateChange dispara con SIGNED_IN
 *     si la sesión sigue vigente, sin necesidad de hacer login otra vez.
 *   - Si no hay sesión, redirige al login.
 */

import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter } from "expo-router";
import { supabase } from "../services/supabase";
import { getProfile } from "../services/profileService";
import theme from "../constants/theme";

const T = theme.lightMode;

export default function RootLayout() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // ── 1. Verificar si hay sesión activa al abrir la app ─────
    verificarSesion();

    // ── 2. Escuchar cambios en tiempo real (login / logout) ───
    // Equivalente a un guard en Angular que corre en cada navegación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (evento, sesion) => {
      if (evento === "SIGNED_IN" && sesion?.user) {
        await redirigirSegunRol(sesion.user.id);
      }
      if (evento === "SIGNED_OUT") {
        router.replace("/login");
      }
    });

    // Limpieza al desmontar (como ngOnDestroy en Angular)
    return () => subscription.unsubscribe();
  }, []);

  const verificarSesion = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        await redirigirSegunRol(session.user.id);
      } else {
        router.replace("/login");
      }
    } catch (e) {
      console.error("Error verificando sesión:", e.message);
      router.replace("/login");
    } finally {
      setVerificando(false);
    }
  };

  /**
   * Obtiene el perfil y redirige según el rol.
   * Aquí conectas los 3 roles con sus pantallas correspondientes.
   */
  const redirigirSegunRol = async (userId) => {
    try {
      const { data: perfil, error } = await getProfile(userId);
      if (error || !perfil) {
        // Si no tiene perfil aún, va al login
        router.replace("/login");
        return;
      }

      switch (perfil.rol) {
        case "conductor":
          router.replace("/home"); // ← pantalla home del conductor
          break;
        case "usuario":
          router.replace("/home"); // ← cuando creen home de usuario
          break;
        case "administrador":
          router.replace("/home"); // ← cuando creen home de admin
          break;
        default:
          router.replace("/login");
      }
    } catch (e) {
      console.error("Error obteniendo rol:", e.message);
      router.replace("/login");
    }
  };

  // Mientras verifica la sesión muestra un spinner (evita flash de login)
  if (verificando) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: T.background,
        }}
      >
        <ActivityIndicator size="large" color={T.icon.active} />
      </View>
    );
  }

  // Slot renderiza la pantalla activa
  return <Slot />;
}
