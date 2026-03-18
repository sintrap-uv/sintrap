import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import {
  validarConductor,
  GENERO_OPCIONES,
} from "../../models/conductor.model";
import {
  actualizarPerfil,
  subirFotoPerfil,
} from "../../services/profile.service";
import { updateProfile } from "../../services/profile.service";

const COLORS = {
  primary: "#1B4FD8", // Azul principal
  primaryLight: "#EEF2FF", // Fondo azul suave
  primaryDark: "#1338A0", // Hover/press
  success: "#16A34A",
  successLight: "#DCFCE7",
  error: "#DC2626",
  errorLight: "#FEE2E2",
  text: "#111827",
  textSecondary: "#6B7280",
  border: "#D1D5DB",
  borderFocus: "#1B4FD8",
  background: "#F9FAFB",
  white: "#FFFFFF",
  surface: "#FFFFFF",
};

// COMPONENTE PRINCIPAL

/**
 * @param {object}   perfilInicial  - Datos actuales del conductor (del servicio)
 * @param {string}   userId         - UUID del usuario autenticado
 * @param {Function} onGuardado     - Callback cuando se guarda exitosamente
 */

export default function EditarPerfilForm({
  perfilInicial,
  userId,
  onGuardado,
}) {
  // Estado del formulario
  const [form, setForm] = useState({
    nombre: perfilInicial?.nombre ?? "",
    cedula: perfilInicial?.cedula ?? "",
    celular: perfilInicial?.celular ?? "",
    genero: perfilInicial?.genero ?? "",
    avatar_url: perfilInicial?.avatar_url ?? "",
  });

  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false); // feedback de éxito

  // Actualizar campo del formulario
  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    // Limpiar error del campo al escribir
    if (errores[campo]) {
      setErrores((prev) => ({ ...prev, [campo]: undefined }));
    }
    setGuardado(false);
  };

  // ── Seleccionar foto
  const seleccionarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert(
        "Permiso requerido",
        "Necesitamos acceso a tu galería para cambiar la foto.",
      );
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // cuadrado para foto de perfil
      quality: 0.7,
    });
    if (!resultado.canceled) {
      actualizarCampo("avatar_url", resultado.assets[0].uri);
    }
  };

  // ── Guardar cambios
  const handleGuardar = async () => {
    // 1. Validar
    const { valido, errores: erroresValidacion } = validarConductor(form);
    if (!valido) {
      setErrores(erroresValidacion);
      return;
    }

    setGuardando(true);
    setErrores({});

    try {
      const cambios = {
        nombre: form.nombre.trim(),
        cedula: form.cedula.trim(),
        celular: form.celular.trim(),
        genero: form.genero,
        // avatar_url: pendiente hasta implemnetar supabase storage
      };

      const { data, error} = await updateProfile(userId, cambios);

      if (error) throw new Error(error.message ?? 'Error al guardar los cambios');
      
      setGuardado(true);
      if (onGuardado) onGuardado(data);

    } catch (e) {
      Alert.alert("Error", e.message ?? "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  // RENDER
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Foto de perfil ─────────────────────────────── */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={seleccionarFoto}
            style={styles.avatarWrapper}
          >
            {form.avatar_url ? (
              <Image source={{ uri: form.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons
                  name="person"
                  size={48}
                  color={COLORS.textSecondary}
                />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
        </View>

        {/* ── Título sección ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>Información personal</Text>

        {/* ── Campo: Nombre ──────────────────────────────── */}
        <CampoTexto
          label="Nombre completo"
          icono="person-outline"
          valor={form.nombre}
          onChange={(v) => actualizarCampo("nombre", v)}
          error={errores.nombre}
          placeholder="Ej: Carlos Ramírez"
          autoCapitalize="words"
        />

        {/* ── Campo: Cédula ──────────────────────────────── */}
        <CampoTexto
          label="Número de cédula"
          icono="card-outline"
          valor={form.cedula}
          onChange={(v) => actualizarCampo("cedula", v)}
          error={errores.cedula}
          placeholder="Ej: 1020304050"
          keyboardType="numeric"
          maxLength={15}
        />

        {/* ── Campo: Teléfono ────────────────────────────── */}
        <CampoTexto
          label="Teléfono / Celular"
          icono="call-outline"
          valor={form.celular}
          onChange={(v) => actualizarCampo("celular", v)}
          error={errores.celular}
          placeholder="Ej: 3001234567"
          keyboardType="phone-pad"
          maxLength={15}
        />

        {/* ── Selector: Género ───────────────────────────── */}
        <View style={styles.campoWrapper}>
          <Text style={styles.label}>Género</Text>
          <View style={styles.generoGrid}>
            {GENERO_OPCIONES.map((opcion) => (
              <TouchableOpacity
                key={opcion.value}
                style={[
                  styles.generoOpcion,
                  form.genero === opcion.value && styles.generoOpcionActiva,
                ]}
                onPress={() => actualizarCampo("genero", opcion.value)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.generoTexto,
                    form.genero === opcion.value && styles.generoTextoActivo,
                  ]}
                >
                  {opcion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Mensaje de éxito ───────────────────────────── */}
        {guardado && (
          <View style={styles.mensajeExito}>
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={COLORS.success}
            />
            <Text style={styles.mensajeExitoTexto}>
              Perfil actualizado correctamente
            </Text>
          </View>
        )}

        {/* ── Botón guardar ──────────────────────────────── */}
        <TouchableOpacity
          style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
          activeOpacity={0.85}
        >
          {guardando ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color={COLORS.white} />
              <Text style={styles.botonTexto}>Guardar cambios</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// SUB-COMPONENTE: CampoTexto reutilizable

function CampoTexto({ label, icono, valor, onChange, error, ...inputProps }) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          enfocado && styles.inputWrapperFocus,
          error && styles.inputWrapperError,
        ]}
      >
        <Ionicons
          name={icono}
          size={18}
          color={
            error
              ? COLORS.error
              : enfocado
                ? COLORS.primary
                : COLORS.textSecondary
          }
          style={styles.inputIcono}
        />
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={onChange}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          placeholderTextColor={COLORS.textSecondary}
          {...inputProps}
        />
      </View>
      {error && (
        <View style={styles.errorWrapper}>
          <Ionicons
            name="alert-circle-outline"
            size={13}
            color={COLORS.error}
          />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}
    </View>
  );
}

// ESTILOS
const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 48,
  },

  // Foto de perfil
  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
    marginTop: 8,
  },
  avatarWrapper: {
    position: "relative",
    width: 96,
    height: 96,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Título sección
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },

  // Campos
  campoWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocus: {
    borderColor: COLORS.borderFocus,
    backgroundColor: COLORS.primaryLight,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  inputIcono: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 0,
  },

  // Errores
  errorWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  errorTexto: {
    fontSize: 12,
    color: COLORS.error,
  },

  // Selector género
  generoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  generoOpcion: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  generoOpcionActiva: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  generoTexto: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  generoTextoActivo: {
    color: COLORS.primary,
    fontWeight: "600",
  },

  // Mensaje éxito
  mensajeExito: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.successLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  mensajeExitoTexto: {
    color: COLORS.success,
    fontSize: 14,
    fontWeight: "500",
  },

  // Botón guardar
  botonGuardar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 50,
    marginTop: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botonDeshabilitado: {
    opacity: 0.7,
  },
  botonTexto: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
});
