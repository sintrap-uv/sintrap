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
import { Ionicons, FontAwesome } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { subirAvatar } from "../../services/uploadService";
import theme from "../../constants/theme";

const T = theme.lightMode; // cambia a theme.darkMode para modo oscuro

import {
  validarConductor,
  GENERO_OPCIONES,
} from "../../models/conductor.model";
import { updateProfile } from "../../services/profileService";

export default function EditarPerfilForm({
  perfilInicial,
  userId,
  onGuardado,
}) {
  const [form, setForm] = useState({
    nombre: perfilInicial?.nombre ?? "",
    cedula: perfilInicial?.cedula ?? "",
    celular: perfilInicial?.celular ?? "",
    genero: perfilInicial?.genero ?? null,
    avatar_url: perfilInicial?.avatar_url ?? null,
    edad: perfilInicial?.edad ? String(perfilInicial.edad) : "",
  });

  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
    setGuardado(false);
  };

  const seleccionarFoto = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería.");
      return;
    }
    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!resultado.canceled)
      actualizarCampo("avatar_url", resultado.assets[0].uri);
  };

  const handleGuardar = async () => {
    const { valido, errores: erroresValidacion } = validarConductor(form);
    if (!valido) {
      setErrores(erroresValidacion);
      return;
    }

    setGuardando(true);
    setErrores({});
    try {
      let avatar_url = form.avatar_url;

      // Si se seleccionó una foto nueva (URI local empieza con file://)
      if (avatar_url && avatar_url.startsWith("file:///")) {
        const { publicUrl, error: errorFoto } = await subirAvatar(
          userId,
          avatar_url,
        );
        if (errorFoto) throw new Error("Error subiendo foto: " + errorFoto);
        avatar_url = publicUrl; // URL públic de supbase Storage
      }

      const cambios = {
        nombre: form.nombre.trim(),
        cedula: form.cedula.trim(),
        celular: form.celular.trim(),
        genero: form.genero,
        edad: form.edad ? parseInt(form.edad) : null,
        avatar_url,
      };

      const { data, error } = await updateProfile(userId, cambios);
      if (error) throw new Error(error.message ?? "Error al guardar");

      setGuardado(true);
      if (onGuardado) onGuardado(data);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setGuardando(false);
    }
  };

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
        {/* Foto de perfil */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={seleccionarFoto}
            style={styles.avatarWrapper}
          >
            {form.avatar_url ? (
              <Image source={{ uri: form.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={48} color={T.text.secondary} />
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
        </View>

        <Text style={styles.sectionTitle}>Información personal</Text>

        <CampoTexto
          label="Nombre completo"
          icono="person-outline"
          IconLib={Ionicons}
          valor={form.nombre}
          onChange={(v) => actualizarCampo("nombre", v)}
          error={errores.nombre}
          placeholder="Carlos Ramírez"
          autoCapitalize="words"
        />

        <CampoTexto
          label="Número de cédula"
          icono="card-outline"
          IconLib={Ionicons}
          valor={form.cedula}
          onChange={(v) => actualizarCampo("cedula", v)}
          error={errores.cedula}
          placeholder="1020304050"
          keyboardType="numeric"
          maxLength={15}
        />

        <CampoTexto
          label="Teléfono / Celular"
          icono="call-outline"
          IconLib={Ionicons}
          valor={form.celular}
          onChange={(v) => actualizarCampo("celular", v)}
          error={errores.celular}
          placeholder="3001234567"
          keyboardType="phone-pad"
          maxLength={15}
        />

        <CampoTexto
          label="Edad"
          icono="birthday-cake"
          IconLib={FontAwesome}
          valor={form.edad}
          onChange={(v) => actualizarCampo("edad", v)}
          error={errores.edad}
          placeholder="25"
          keyboardType="numeric"
          maxLength={3}
        />

        {/* Género */}
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

        {guardado && (
          <View style={styles.mensajeExito}>
            <Ionicons name="checkmark-circle" size={18} color={T.icon.active} />
            <Text style={styles.mensajeExitoTexto}>
              Perfil actualizado correctamente
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.botonGuardar, guardando && styles.botonDeshabilitado]}
          onPress={handleGuardar}
          disabled={guardando}
          activeOpacity={0.85}
        >
          {guardando ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.botonTexto}>Guardar cambios</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// CampoTexto reutilizable
function CampoTexto({
  label,
  icono,
  IconLib,
  valor,
  onChange,
  error,
  ...rest
}) {
  const [enfocado, setEnfocado] = useState(false);
  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          enfocado && styles.inputFocus,
          error && styles.inputError,
        ]}
      >
        <IconLib
          name={icono}
          size={18}
          color={
            error ? T.icon.error : enfocado ? T.icon.active : T.icon.default
          }
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={styles.input}
          value={valor}
          onChangeText={onChange}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          placeholderTextColor={T.input.placeholder}
          {...rest}
        />
      </View>
      {error && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: 4,
            gap: 4,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={13}
            color={T.icon.error}
          />
          <Text style={{ fontSize: 12, color: T.icon.error }}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: T.background },
  container: { padding: 20, paddingBottom: 48 },

  avatarSection: { alignItems: "center", marginBottom: 28, marginTop: 8 },
  avatarWrapper: { position: "relative", width: 96, height: 96 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: T.cards.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: T.cards.border,
    borderStyle: "dashed",
  },
  avatarBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: T.Button.primary.background,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  avatarHint: { marginTop: 8, fontSize: 12, color: T.text.secondary },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  campoWrapper: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: T.text.primary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: T.input.background,
    borderWidth: 1.5,
    borderColor: T.input.border,
    borderRadius: T.input.borderRadius,
    paddingHorizontal: 12,
    height: 48,
  },
  inputFocus: { borderColor: T.icon.active },
  inputError: { borderColor: T.icon.error },
  input: { flex: 1, fontSize: 15, color: T.input.text, paddingVertical: 0 },

  generoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  generoOpcion: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: T.cards.border,
    backgroundColor: T.cards.background,
  },
  generoOpcionActiva: { borderColor: T.icon.active },
  generoTexto: { fontSize: 13, color: T.text.secondary },
  generoTextoActivo: { color: T.text.routName, fontWeight: "600" },

  mensajeExito: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  mensajeExitoTexto: { color: T.icon.active, fontSize: 14, fontWeight: "500" },

  botonGuardar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.Button.primary.background,
    borderRadius: T.Button.primary.borderRadius,
    height: 50,
    marginTop: 8,
    shadowColor: T.Button.primary.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: T.Button.primary.Text, fontSize: 16, fontWeight: "600" },
});
