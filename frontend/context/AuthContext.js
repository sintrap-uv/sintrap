import { useState, useContext, createContext, useEffect } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext();

/**
 * AuthProvider: Gestiona la autenticación de la app
 * Mantiene el estado de sesión del usuario logueado
 *
 * Proporciona:
 * - user: objeto del usuario autenticado {id, email, user_metadata, etc}
 * - session: token y datos de sesión de Supabase
 * - loading: boolean indicando si está verificando sesión
 * - signIn: función para login con email/password
 * - signOut: función para logout
 * - signUp: función para registro
 * - resetPassword: función para reset de contraseña
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar sesión activa al montar el componente
  useEffect(() => {
    checkSession();

    // Listener para cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log("Auth event:", event);

      if (newSession) {
        setSession(newSession);
        // Obtener datos del perfil del usuario
        const profileData = await obtenerPerfil(newSession.user.id);
        setUser({
          ...newSession.user,
          profile: profileData,
        });
      } else {
        setSession(null);
        setUser(null);
      }

      setLoading(false);
    });

    // Cleanup: desuscribir del listener al desmontar
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Verifica si hay sesión activa guardada en el dispositivo
   */
  const checkSession = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error("Error verificando sesión:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        setSession(data.session);
        // Obtener datos del perfil
        const profileData = await obtenerPerfil(data.session.user.id);
        setUser({
          ...data.session.user,
          profile: profileData,
        });
      }

      setLoading(false);
    } catch (err) {
      console.error("Exception en checkSession:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  /**
   * Obtiene los datos del perfil del usuario desde tabla profiles
   * @param {string} userId - ID del usuario
   * @returns {Object|null} Datos del perfil o null
   */
  const obtenerPerfil = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error obteniendo perfil:", error);
        return null;
      }

      return data;
    } catch (err) {
      console.error("Exception en obtenerPerfil:", err);
      return null;
    }
  };

  /**
   * Login con email y contraseña
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @throws {Error} Si ocurre error en Supabase
   */
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      setSession(data.session);
      const profileData = await obtenerPerfil(data.user.id);
      setUser({
        ...data.user,
        profile: profileData,
      });

      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      console.error("Error en signIn:", err);
      throw err;
    }
  };

  /**
   * Registro de nuevo usuario
   * @param {string} email - Email del nuevo usuario
   * @param {string} password - Contraseña
   * @param {Object} metadata - Datos adicionales {nombre, celular, etc}
   * @throws {Error} Si ocurre error en Supabase
   */
  const signUp = async (email, password, metadata = {}) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
          },
        },
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      // Nota: después del signup, el usuario necesita confirmar email
      // La sesión se establece pero user.confirmed_at será null

      setLoading(false);
      return { success: true, user: data.user };
    } catch (err) {
      setLoading(false);
      console.error("Error en signUp:", err);
      throw err;
    }
  };

  /**
   * Logout del usuario actual
   * @throws {Error} Si ocurre error en Supabase
   */
  const signOut = async () => {
    try {
      setLoading(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        setError(error.message);
        throw error;
      }

      setUser(null);
      setSession(null);
      setLoading(false);

      return { success: true };
    } catch (err) {
      setLoading(false);
      console.error("Error en signOut:", err);
      throw err;
    }
  };

  /**
   * Envía email de reset de contraseña
   * @param {string} email - Email del usuario
   * @throws {Error} Si ocurre error en Supabase
   */
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "https://sintrap-app.com/reset-password",
      });

      if (error) {
        setError(error.message);
        throw error;
      }

      setLoading(false);
      return { success: true };
    } catch (err) {
      setLoading(false);
      console.error("Error en resetPassword:", err);
      throw err;
    }
  };

  /**
   * Actualiza datos del perfil del usuario
   * @param {Object} cambios - Objeto con campos a actualizar {nombre, celular, etc}
   * @throws {Error} Si ocurre error en Supabase
   */
  const actualizarPerfil = async (cambios) => {
    if (!user?.id) throw new Error("No hay usuario autenticado");

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update(cambios)
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      // Actualizar user en estado
      setUser(prev => ({
        ...prev,
        profile: { ...prev?.profile, ...cambios },
      }));

      return { success: true, profile: data };
    } catch (err) {
      console.error("Error en actualizarPerfil:", err);
      throw err;
    }
  };

  /**
   * Verifica si el usuario está autenticado
   */
  const isAuthenticated = () => !!user && !!session;

  /**
   * Obtiene el rol del usuario actual
   */
  const getUserRole = () => user?.profile?.rol || null;

  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    actualizarPerfil,
    isAuthenticated,
    getUserRole,
    checkSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook para usar AuthContext en cualquier componente
 * @throws {Error} Si se usa fuera de AuthProvider
 * @returns {Object} Valores del contexto de autenticación
 */
export const useAuth = () => {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return contexto;
};

export default AuthContext;
