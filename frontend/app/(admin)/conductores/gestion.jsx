import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { createDriverAccount, updateDriver } from "../../../services/driverService";
import theme from "../../../constants/theme";
import Header from "../../../components/Header";

const T = theme.lightMode;

// Validación local (sin librería externa)
function validarForm(form, esNuevo) {
  const errores = {};

  if (!form.nombre.trim()) errores.nombre = "El nombre es requerido";
  else if (form.nombre.trim().length < 3) errores.nombre = "Mínimo 3 caracteres";

  if (!form.cedula.trim()) errores.cedula = "La cédula es requerida";
  else if (!/^\d{5,15}$/.test(form.cedula.trim())) errores.cedula = "Solo números (5–15 dígitos)";

  if (!form.celular.trim()) errores.celular = "El celular es requerido";
  else if (!/^\d{7,15}$/.test(form.celular.trim())) errores.celular = "Solo números (7–15 dígitos)";

  if (esNuevo) {
    if (!form.email.trim()) errores.email = "El email es requerido";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errores.email = "Email inválido";

    if (!form.password) errores.password = "La contraseña es requerida";
    else if (form.password.length < 6) errores.password = "Mínimo 6 caracteres";
  }

  return { valido: Object.keys(errores).length === 0, errores };
}

// ─────────────────────────────────────────────────────────────
// PANTALLA PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function GestionConductorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // modo: 'nuevo' | 'editar'  — viene del router.push de index.jsx
  const esNuevo = params.modo === "nuevo";

  const [form, setForm] = useState({
    nombre:   params.nombre   ?? "",
    cedula:   params.cedula   ?? "",
    celular:  params.celular  ?? "",
    email:    params.email    ?? "",
    password: "",
  });

  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const actualizarCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    if (errores[campo]) setErrores((prev) => ({ ...prev, [campo]: undefined }));
  };

  const handleGuardar = async () => {
    const { valido, errores: erroresValidacion } = validarForm(form, esNuevo);
    if (!valido) {
      setErrores(erroresValidacion);
      return;
    }

    setGuardando(true);
    try {
      if (esNuevo) {
        const { error } = await createDriverAccount(form);
        if (error) throw new Error(error.message ?? "Error al crear conductor");
        Alert.alert("✓ Conductor creado", `${form.nombre} fue registrado exitosamente.`, [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        const { error } = await updateDriver(params.conductorId, form);
        if (error) throw new Error(error.message ?? "Error al actualizar");
        Alert.alert("✓ Conductor actualizado", "Los datos fueron guardados.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setGuardando(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ✅ Header — titulo/subtitulo directo, sin HEADER_CONFIGS ni perfil */}
      <Header
        titulo={esNuevo ? "Nuevo conductor" : "Editar conductor"}
        subtitulo={esNuevo ? "Completa los datos para registrar" : "Modifica los datos del conductor"}
        mode="light"
        iconoDerecha={
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back-outline" size={26} color="#fff" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Datos personales</Text>

        <CampoTexto
          label="Nombre completo"
          icono="person-outline"
          valor={form.nombre}
          onChange={(v) => actualizarCampo("nombre", v)}
          error={errores.nombre}
          placeholder="Carlos Ramírez"
          autoCapitalize="words"
        />

        <CampoTexto
          label="Número de cédula"
          icono="card-outline"
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
          valor={form.celular}
          onChange={(v) => actualizarCampo("celular", v)}
          error={errores.celular}
          placeholder="3001234567"
          keyboardType="phone-pad"
          maxLength={15}
        />

        {/* Email — editable solo en 'nuevo', solo lectura en 'editar' */}
        <Text style={styles.sectionTitle}>Credenciales</Text>

        <CampoTexto
          label="Correo electrónico"
          icono="mail-outline"
          valor={form.email}
          onChange={(v) => actualizarCampo("email", v)}
          error={errores.email}
          placeholder="conductor@sintrap.com"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={esNuevo}                            // solo lectura en edición
          soloLectura={!esNuevo}
        />
        {!esNuevo && (
          <Text style={styles.notaEmail}>
            <Ionicons name="information-circle-outline" size={12} color={T.text.secondary} />
            {" "}El email no puede modificarse desde aquí.
          </Text>
        )}

        {/* Password — solo visible en 'nuevo' */}
        {esNuevo && (
          <View style={styles.campoWrapper}>
            <Text style={styles.label}>Contraseña</Text>
            <View
              style={[
                styles.inputWrapper,
                errores.password && styles.inputError,
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={errores.password ? T.icon.error : T.icon.default}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={(v) => actualizarCampo("password", v)}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor={T.input.placeholder}
                secureTextEntry={!verPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setVerPassword((v) => !v)}>
                <Ionicons
                  name={verPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={T.icon.default}
                />
              </TouchableOpacity>
            </View>
            {errores.password && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={13} color={T.icon.error} />
                <Text style={styles.errorTexto}>{errores.password}</Text>
              </View>
            )}
          </View>
        )}

        {/* Botón guardar */}
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
              <Text style={styles.botonTexto}>
                {esNuevo ? "Crear conductor" : "Guardar cambios"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Botón cancelar */}
        <TouchableOpacity
          style={styles.botonCancelar}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.botonCancelarTexto}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────
// Campo reutilizable (mismo patrón que EditarPerfilForm)
// ─────────────────────────────────────────────────────────────
function CampoTexto({ label, icono, valor, onChange, error, soloLectura, ...rest }) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={styles.campoWrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          enfocado && !soloLectura && styles.inputFocus,
          error && styles.inputError,
          soloLectura && styles.inputReadOnly,
        ]}
      >
        <Ionicons
          name={icono}
          size={18}
          color={error ? T.icon.error : enfocado ? T.icon.active : T.icon.default}
          style={{ marginRight: 8 }}
        />
        <TextInput
          style={[styles.input, soloLectura && styles.inputReadOnlyText]}
          value={valor}
          onChangeText={onChange}
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          placeholderTextColor={T.input.placeholder}
          editable={!soloLectura}
          {...rest}
        />
        {soloLectura && (
          <Ionicons name="lock-closed-outline" size={14} color={T.text.secondary} />
        )}
      </View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={13} color={T.icon.error} />
          <Text style={styles.errorTexto}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: T.background },
  container: { padding: 20, paddingBottom: 48 },

  // ── Encabezado ────────────────────────────────────────────
  encabezado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: T.cards.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.cards.border,
    padding: 16,
    marginBottom: 24,
  },
  encabezadoIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: T.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.cards.border,
  },
  encabezadoTitulo: { fontSize: 17, fontWeight: "700", color: T.text.primary },
  encabezadoSub: { fontSize: 13, color: T.text.secondary, marginTop: 2 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
    marginTop: 8,
  },

  // ── Campo de texto ────────────────────────────────────────
  campoWrapper: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: T.text.primary, marginBottom: 6 },
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
  inputReadOnly: { backgroundColor: T.cards.background, borderStyle: "dashed" },
  input: { flex: 1, fontSize: 15, color: T.input.text, paddingVertical: 0 },
  inputReadOnlyText: { color: T.text.secondary },

  errorRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  errorTexto: { fontSize: 12, color: T.icon.error },

  notaEmail: { fontSize: 12, color: T.text.secondary, marginTop: -8, marginBottom: 12 },

  // ── Botones ───────────────────────────────────────────────
  botonGuardar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.Button.primary.background,
    borderRadius: T.Button.primary.borderRadius,
    height: 50,
    marginTop: 16,
    shadowColor: T.Button.primary.background,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botonDeshabilitado: { opacity: 0.7 },
  botonTexto: { color: T.Button.primary.Text, fontSize: 16, fontWeight: "600" },
  botonCancelar: {
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    marginTop: 8,
  },
  botonCancelarTexto: { color: T.text.secondary, fontSize: 15 },
  asterisk: { color: "#EF4444" },   // ← # faltaba en tu versión
});
