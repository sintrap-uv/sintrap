import {supabase} from './supabase'

// Registro de usuario

export const signUp = async (email, password) => {
    const {data, error} = await supabase.auth.signUp({
        email,  
        password
    })
    return {data, error}
}

// Inicio de sesión
export const signIn = async (email, password) => {
    const {data, error} = await supabase.auth.signInWithPassword({
        email,
        password
    })
    return {data, error}
}

// Cierre de sesión

export const signOut = async () => {
    const {error} = await supabase.auth.signOut()
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

