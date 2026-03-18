/**
 * profile.service.js
 *
 * POR AHORA: usa datos MOCK (hardcodeados)  *
 * CUANDO SUPABASE ESTÉ LISTO: reemplaza las funciones mock por las
 * llamadas reales a Supabase (ya marcadas con comentarios TODO).
 *
 * Uso:
 *   import { obtenerPerfil, actualizarPerfil } from '../services/profile.service';
 */

// import { supabase } from './supabase';

// ─────────────────────────────────────────────
// DATOS MOCK — Simula la respuesta de Supabase
// ─────────────────────────────────────────────

const MOCK_CONDUCTOR = {
  id: "uuid-mock-123",
  nombre: "Carlos Ramírez",
  cedula: "1020304050",
  celular: "3001234567",
  avatar_url: null,
  genero: "masculino",
  rol: "conductor",
};

// Simula un retardo de red (200ms) para que se parezca a una llamada real
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// FUNCIONES DEL SERVICIO

/**
 * Obtiene el perfil del conductor actualmente autenticado.
 *
 * @returns {Promise<{ datos: object|null, error: string|null }>}
 *
 * ------- VERSIÓN SUPABASE (reemplazar cuando esté lista) -------
 * const { data, error } = await supabase
 *   .from('profiles')
 *   .select('*')
 *   .eq('id', supabase.auth.getUser().data.user.id)
 *   .single();
 * return { datos: data, error: error?.message ?? null };
 * ---------------------------------------------------------------
 */
export async function obtenerPerfil() {
  await delay(200); // simula latencia de red

  // Simula éxito
  return { datos: { ...MOCK_CONDUCTOR }, error: null };

  // Simula error (descomenta para probar manejo de errores):
  // return { datos: null, error: 'No se pudo cargar el perfil' };
}

/**
 * Actualiza el perfil del conductor en la base de datos.
 *
 * @param {string} userId - UUID del usuario (viene de Supabase Auth)
 * @param {object} cambios - Campos a actualizar (solo los modificados)
 * @returns {Promise<{ datos: object|null, error: string|null }>}
 *
 * ------- VERSIÓN SUPABASE
 * const { data, error } = await supabase
 *   .from('profiles')
 *   .update(cambios)
 *   .eq('id', userId)
 *   .select()
 *   .single();
 * return { datos: data, error: error?.message ?? null };
 * ---------------------------------------------------------------
 */
export async function actualizarPerfil(userId, cambios) {
  await delay(400); // simula latencia de escritura

  // Simula actualización exitosa (mezcla mock con cambios)
  const actualizado = { ...MOCK_CONDUCTOR, ...cambios };
  return { datos: actualizado, error: null };

  // Simula error (descomenta para probar):
  // return { datos: null, error: 'Error al guardar los cambios' };
}

/**
 * Sube una foto de perfil al storage.
 *
 * @param {string} userId - UUID del usuario
 * @param {object} archivo - Objeto del archivo seleccionado (de ImagePicker)
 * @returns {Promise<{ url: string|null, error: string|null }>}
 *
 * ------- VERSIÓN SUPABASE
 * const filePath = `avatars/${userId}.jpg`;
 * const { error: uploadError } = await supabase.storage
 *   .from('avatars')
 *   .upload(filePath, archivo, { upsert: true });
 * if (uploadError) return { url: null, error: uploadError.message };
 * const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
 * return { url: data.publicUrl, error: null };
 * ---------------------------------------------------------------
 */
export async function subirFotoPerfil(userId, archivo) {
  await delay(600);
  // Mock: retorna una URL de imagen de prueba
  return { url: "https://i.pravatar.cc/150?u=" + userId, error: null };
}
