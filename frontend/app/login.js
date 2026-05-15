 import React, { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, StatusBar, KeyboardAvoidingView,
  Platform, ScrollView, Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signIn } from "../services/auth";
import LogoSintrap from "../components/LogoSintrap";

// ─── PALETA ORIGINAL — solo modernizada ──────────────────────────────────
const C = {
  // Fondos
  bg1:       "#EBEBEB",   // gris claro original
  bg2:       "#F5F5F5",   // gris más claro para degradado
  card:      "#FFFFFF",

  // Verde (idéntico al original)
  green:     "#16A34A",
  greenGlow: "rgba(22,163,74,0.18)",
  greenSoft: "rgba(22,163,74,0.10)",

  // Texto
  text:      "#111827",
  sub:       "#374151",
  muted:     "#6b7280",

  // Inputs
  inputBg:   "#F9FAFB",
  border:    "#E5E7EB",
  borderFocus:"#16A34A",

  // Rojo original
  red:       "#A61B1B",
  redSoft:   "FCE8E8",
};

// ─── INPUT CON FOCUS ANIMADO ──────────────────────────────────────────────
function AnimatedInput({ label, icon, secureEntry, rightIcon, onRightPress, value, onChangeText, placeholder, keyboardType, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.borderFocus],
  });
  const shadowOpacity = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.15],
  });

  return (
    <View style={inp.wrap}>
      {label && <Text style={inp.label}>{label}</Text>}
      <Animated.View style={[
        inp.box,
        { borderColor, shadowColor: C.green, shadowOpacity, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: focused ? 3 : 0 }
      ]}>
        <Ionicons name={icon} size={17} color={focused ? C.green : C.muted} style={inp.icon} />
        <TextInput
          style={inp.field}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureEntry}
          keyboardType={keyboardType ?? "default"}
          autoCapitalize={autoCapitalize ?? "none"}
          autoCorrect={false}
          onFocus={onFocus}
          onBlur={onBlur}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={rightIcon} size={17} color={C.muted} />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const inp = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: C.sub, marginBottom: 7, letterSpacing: 0.3 },
  box:   {
    flexDirection: "row", alignItems: "center",
    backgroundColor: C.inputBg,
    borderRadius: 19, borderWidth: 1.5,
    paddingHorizontal: 3, paddingVertical: 3,
  },
  icon:  { marginRight: 10 },
  field: { flex: 1, fontSize: 15, color: C.text, letterSpacing: 0.1 },
});

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────
export default function Login() {
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const btnScale = useRef(new Animated.Value(1)).current;
  const router = useRouter();

  const onPressIn  = () => Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true }).start();
  const onPressOut = () => Animated.spring(btnScale, { toValue: 1,    useNativeDriver: true }).start();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      alert("Por favor completa todos los campos.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await signIn(email.trim(), password);
      if (error) alert("Error al iniciar sesión: " + error.message);
      else router.replace("/home");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg1} />

      {/* Círculos decorativos de fondo */}
      <View style={s.circle1} pointerEvents="none" />
      <View style={s.circle2} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Logo ── */}
        <View style={s.logoArea}>
          {/* Glow verde detrás del logo */}
          <View style={s.logoGlow} />
          <LogoSintrap size={96} color="#1a1a1a" />
          <Text style={s.appName}>Sintrap</Text>
          <View style={s.taglineRow}>
            <View style={s.taglineDot} />
            
            <View style={s.taglineDot} />
          </View>
        </View>

        {/* ── Card ── */}
        <View style={s.card}>

          {/* Header card */}
          <View style={s.cardHead}>
            <Text style={s.cardTitle}>Bienvenido</Text>
            <Text style={s.cardSub}>Ingresa a tu cuenta para continuar</Text>
          </View>

          {/* Inputs */}
          <AnimatedInput
            label="CORREO ELECTRÓNICO"
            icon="mail-outline"
            placeholder="tucorreo@ejemplo.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <AnimatedInput
            label="CONTRASEÑA"
            icon="lock-closed-outline"
            placeholder="Ingresa tu contraseña"
            value={password}
            onChangeText={setPassword}
            secureEntry={!showPassword}
            rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
            onRightPress={() => setShowPassword(!showPassword)}
          />

          {/* Olvidaste contraseña */}
          <TouchableOpacity
            style={s.forgotWrap}
            onPress={() => router.push("/profiles/resetPassword")}
          >
            <Text style={s.forgotText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón login con micro animación */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[s.btn, loading && s.btnLoading]}
              onPress={handleLogin}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={loading}
              activeOpacity={1}
            >
              {loading ? (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>Ingresando</Text>
                  <Text style={s.btnDots}>...</Text>
                </View>
              ) : (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>Iniciar sesión</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Divisor premium */}
          <View style={s.divider}>
            <View style={s.divLine} />
            <Text style={s.divText}>¿No tienes cuenta?</Text>
            <View style={s.divLine} />
          </View>

          {/* Botón crear cuenta */}
          <TouchableOpacity
            style={s.registerBtn}
            onPress={() => router.push("/profiles/register")}
            activeOpacity={0.8}
          >
            <Text style={s.registerText}>Crear una cuenta</Text>
          </TouchableOpacity>

        </View>

        {/* Footer */}
        <Text style={s.footer}>Sintrap © 2026 · Todos los derechos reservados</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg1,
  },

  // Círculos decorativos
  circle1: {
    position: "absolute", top: -80, right: -80,
    width: 260, height: 260, borderRadius: 130,
    backgroundColor: C.greenSoft,
  },
  circle2: {
    position: "absolute", bottom: -60, left: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: "rgba(0,0,0,0.03)",
  },

  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 52,
  },

  // Logo
  logoArea: { alignItems: "center", marginBottom: 22, position: "relative" },
  logoGlow: {
    position: "absolute",
    top: 8, left: "50%",
    width: 80, height: 80,
    marginLeft: -40,
    borderRadius: 40,
    backgroundColor: C.greenGlow,
  },
  appName: {
    fontSize: 34, fontWeight: "800",
    color: C.text, letterSpacing: -1,
    marginTop: 10,
  },
  taglineRow:  { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  taglineDot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: C.green },
  tagline:     { fontSize: 11, color: C.muted, fontWeight: "500", letterSpacing: 0.5 },

  // Card
  card: {
    width: "100%",
    backgroundColor: C.card,
    borderRadius: 28,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  cardHead:  { marginBottom: 24 },
  cardTitle: { fontSize: 30, fontWeight: "800", color: C.text, letterSpacing: -0.5 },
  cardSub:   { fontSize: 14, color: C.muted, marginTop: 4 },

  // Forgot
  forgotWrap: { alignSelf: "flex-end", marginBottom: 20, marginTop: 2 },
  forgotText: { fontSize: 12, color: C.green, fontWeight: "600", letterSpacing: 0.2 },

  // Botón
  btn: {
    backgroundColor: C.green,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  btnLoading: { opacity: 0.75 },
  btnInner:   { flexDirection: "row", alignItems: "center", gap: 10 },
  btnText:    { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  btnDots:    { color: "#fff", fontSize: 16, fontWeight: "700" },

  // Divisor
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 22, gap: 12 },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: { fontSize: 12, color: C.muted, fontWeight: "500" },

  // Registro
  registerBtn: {
    borderWidth: 1.5,
    borderColor: "#F5C2C2",
    backgroundColor: C.redSoft,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  registerText: {
    fontSize: 15, fontWeight: "700",
    color: C.red, letterSpacing: 0.2,
  },

  // Footer
  footer: {
    marginTop: 28,
    fontSize: 10,
    color: "#A1A1AA",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});