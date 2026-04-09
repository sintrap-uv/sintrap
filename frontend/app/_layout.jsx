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

import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator } from "react-native";
import { Slot, useRouter } from "expo-router";
import { supabase } from "../services/supabase";
import { getProfile } from "../services/profileService";
<<<<<<< HEAD
import NotificacionToast from "../components/ToastNotificacion";
import { ToastProvider } from "../context/ToastContext";
import { useToast } from "../context/ToastContext";
=======
import { getStoredSession } from "../services/authStorageService";
>>>>>>> origin/master
import theme from "../constants/theme";

const T = theme.lightMode;

function AppConToast() {
  const { toast, hideToast } = useToast();
  
  return (
    <>
      <Slot />
      <NotificacionToast 
        visible={toast.visible}
        mensaje={toast.message}
        tipo={toast.type}
        alOcultar={hideToast}
      />
    </>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const [verificando, setVerificando] = useState(true);
  const ejecutado = useRef(false);

  useEffect(() => {
<<<<<<< HEAD
    verificarSesion();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (evento, sesion) => {
      if (evento === "SIGNED_IN" && sesion?.user) {
        await redirigirSegunRol(sesion.user.id);
      }
      if (evento === "SIGNED_OUT") {
=======
    // Solo ejecutar una vez
    if (ejecutado.current) return;
    ejecutado.current = true;

    const iniciar = async () => {
      try {
        const storedSession = await getStoredSession();
        
        if (storedSession?.user) {
          // Restaurar sesión en Supabase
          await supabase.auth.setSession({
            access_token: storedSession.access_token,
            refresh_token: storedSession.refresh_token,
          });
          
          // Obtener perfil
          const { data: perfil } = await getProfile(storedSession.user.id);
          
          // Quitar el loading
          setVerificando(false);
          
          // Redirigir
          if (perfil?.rol) {
            router.replace("/home");
          } else {
            router.replace("/login");
          }
        } else {
          setVerificando(false);
          router.replace("/login");
        }
      } catch (error) {
        console.error("Error:", error);
        setVerificando(false);
>>>>>>> origin/master
        router.replace("/login");
      }
    };

<<<<<<< HEAD
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

  const redirigirSegunRol = async (userId) => {
    try {
      const { data: perfil, error } = await getProfile(userId);
      if (error || !perfil) {
        router.replace("/login");
        return;
      }

      switch (perfil.rol) {
        case "conductor":
          router.replace("/home");
          break;
        case "usuario":
          router.replace("/home");
          break;
        case "administrador":
          router.replace("/home");
          break;
        default:
          router.replace("/login");
      }
    } catch (e) {
      console.error("Error obteniendo rol:", e.message);
      router.replace("/login");
    }
  };

=======
    iniciar();
  }, []);

>>>>>>> origin/master
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

<<<<<<< HEAD
  return (
    <ToastProvider>
      <AppConToast />
    </ToastProvider>
  );
=======
  return <Slot />;
>>>>>>> origin/master
}