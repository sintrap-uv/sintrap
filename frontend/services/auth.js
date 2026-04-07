import {supabase} from './supabase'
import { saveSession, clearSession } from './authStorageService'

// Registro de usuario
export const signUp = async (email, password) => {
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: 'exp://localhost:19000/home',
    },
  })

  // Solo guardar sesión si viene completa con refresh token
  if (!error && data?.session) {
    const result = await saveSession(data.session);
    if (!result.success) {
      console.warn("Signup exitoso pero sesión incompleta:", result.error);
    }
  }

  return {
    data,
    error,
    pendingEmailConfirmation: !data?.session && !error,
  }
}

// Inicio de sesión
export const signIn = async (email, password) => {
  const {data, error} = await supabase.auth.signInWithPassword({
    email,
    password
  })

  // Guardar sesión si el signIn fue exitoso y tiene tokens completos
  if (!error && data?.session) {
    const result = await saveSession(data.session);
    if (!result.success) {
      return { data: null, error: result.error };
    }
  }

  return {data, error}
}

// Cierre de sesión
export const signOut = async () => {
  const {error} = await supabase.auth.signOut()

  // Limpiar sesion de AsyncStorage
  if (!error) {
    console.log('Cerrando session ...');
    await clearSession();
  }
  return {error}
}

// Obtener el usuario actual
export const getCurrentUser = () => {
    return supabase.auth.getUser()
}


// Restablecer contraseña

export const resetPassword = async (email) => {
    const {data, error} = await supabase.auth.resetPasswordForEmail(email, {
        options: {
            redirectTo: "exp://localhost:19000/reset-password"
        }
    })
    return {data, error}
}

