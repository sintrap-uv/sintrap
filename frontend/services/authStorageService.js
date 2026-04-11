import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "sintrap_auth_session";
const ACCESS_TOKEN_KEY = "sintrap_access_token";
const REFRESH_TOKEN_KEY = "sintrap_refresh_token";

// Función auxiliar para manejar el almacenamiento según la plataforma
const storage = {
  getItem: async (key) => {
    if (Platform.OS === "web") return await AsyncStorage.getItem(key);
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === "web") return await AsyncStorage.setItem(key, value);
    return await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    if (Platform.OS === "web") return await AsyncStorage.removeItem(key);
    return await SecureStore.deleteItemAsync(key);
  },
};

export const saveSession = async (session) => {
  try {
    if (!session) return { success: false, error: "Session is required" };

    // Validar que existan los tokens requeridos
    if (!session.access_token) {
      return { success: false, error: "Access token is required" };
    }

    // El refresh_token es crítico para restaurar sesiones más adelante
    if (!session.refresh_token) {
      console.warn("Warning: Saving session without refresh token");
      return { success: false, error: "Refresh token is required" };
    }

    // Guardar tokens
    await storage.setItem(ACCESS_TOKEN_KEY, session.access_token);
    await storage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);

    // Guardar datos del usuario
    const sessionData = {
      user: session.user,
      expires_at: session.expires_at,
      expires_in: session.expires_in,
    };

    await storage.setItem(SESSION_KEY, JSON.stringify(sessionData));

    return { success: true };
  } catch (error) {
    console.error("Error saving session:", error);
    return { success: false, error: error.message };
  }
};

export const getStoredSession = async () => {
  try {
    // Usamos 'storage'
    const sessionJSON = await storage.getItem(SESSION_KEY);
    if (!sessionJSON) return null;

    const sessionData = JSON.parse(sessionJSON);
    if (!sessionData?.user?.id) {
      await clearSession();
      return null;
    }

    const accessToken = await storage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);

    if (!accessToken) {
      await clearSession();
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: sessionData.user,
      expires_at: sessionData.expires_at,
      expires_in: sessionData.expires_in,
    };
  } catch (error) {
    console.error("Error retrieving session:", error);
    await clearSession();
    return null;
  }
};

export const clearSession = async () => {
  try {
    // Usamos 'storage' para todo
    await storage.removeItem(SESSION_KEY);
    await storage.removeItem(ACCESS_TOKEN_KEY);
    await storage.removeItem(REFRESH_TOKEN_KEY);
    return { success: true };
  } catch (error) {
    console.error("Error clearing session:", error);
    return { success: false, error: error.message };
  }
};

export const isSessionExpired = (session) => {
  if (!session?.expires_at) return false;
  // Compara el tiempo actual (en segundos) con el de expiración
  const currentTime = Math.floor(Date.now() / 1000);
  return currentTime > session.expires_at;
};
