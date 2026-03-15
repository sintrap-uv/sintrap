import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system/legacy";

export async function subirAvatar(userId, fileUri) {
  try {
    // Detectar extensión y mime type desde la URI
    const extension = fileUri.split(".").pop()?.toLowerCase() ?? "jpg";
    const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    const filePath = `${userId}.${extension}`;

    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: "base64",
    });

    // Convertir base64 → ArrayBuffer
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const arrayBuffer = bytes.buffer;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) throw error;

    // URL pública con cache-buster para que la UI recargue la imagen
    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = `${data.publicUrl}?t=${Date.now()}`;

    return { publicUrl, error: null };
  } catch (e) {
    console.error("uploadService.subirAvatar: ", e.message);
    return { publicUrl: null, error: e.message };
  }
}

/**
 * Elimina foto de perfil del bucket.
 *
 * @param {string} userId - UUID del usuario
 * @returns {Promise<{ error: string|null}>}
 */
export async function eliminarAvatar(userId) {
  try {
    const { error } = await supabase.storage
      .from("avatars")
      .remove([`${userId}.jpg`, `${userId}.png`]);

    if (error) throw new Error(error.message);
    return { error: null };
  } catch (e) {
    console.error("uploadService.eliminarAvatar: ", e.message);
    return { error: e.message };
  }
}

/**
 * Retorna la URL pública actual del avatar de un usuario.
 *
 * @param {string} userId    - UUID del usuario
 * @param {string} extension - 'jpg' o 'png' (default: 'jpg')
 * @returns {string} URL pública
 */
export function getAvatarUrl(userId, extension = "jpg") {
  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(`${userId}.${extension}`);
  return data.publicUrl;
}
