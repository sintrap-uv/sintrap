import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { supabase } from "../../services/supabase";
import theme from "../../constants/theme";

const t = theme.lightMode;

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tieneSession, setTieneSession] = useState(false)
  const [verificando, setVerificando] = useState(true)

  const router = useRouter();
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession()
      setTieneSession(!!data.session)
      setVerificando(false)
    }
    checkSession()
  }, [])

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      alert("Por favor completa todos los campos.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("¡Contraseña actualizada correctamente!");

      if (tieneSession) {
        // Vino desde el perfil → vuelve atrás
        onDone?.()
      } else {
        // Vino desde recuperación → va al login
        await supabase.auth.signOut()
        router.replace("/login")
      }
    }
  };

  if (verificando) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <LinearGradient
          colors={t.Headers?.gradientColors ?? ["#16A34A", "#22C55E"]}
          style={styles.header}
        >
          <View style={styles.busIcon}>
            <Ionicons name="bus" size={28} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Bienvenido a{"\n"}Sintrap</Text>
        </LinearGradient>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {tieneSession ? "Cambiar contraseña" : "Nueva contraseña"}
          </Text>
          <Text style={styles.cardSubtitle}>
            {tieneSession
              ? "Ingresa tu nueva contraseña para actualizar tu cuenta."
              : "Crea una nueva contraseña para recuperar tu cuenta."
            }
          </Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nueva contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} activeOpacity={0.7}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="#9CA3AF"
              />
            </TouchableOpacity>
          </View>

          {/* Botón */}
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleUpdatePassword}
            activeOpacity={0.8}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Actualizar contraseña</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Volver — solo si vino desde el perfil */}
        {tieneSession && (
          <TouchableOpacity onPress={onDone} activeOpacity={0.7} style={styles.volverLink}>
            <Text style={styles.volverLinkText}>Volver al perfil</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  loadingWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  scroll: {
    flexGrow: 1,
  },
  header: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  busIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    lineHeight: 28,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 24,
    marginTop: -24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    marginBottom: 14,
    backgroundColor: "#FAFAFA",
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  btn: {
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  volverLink: {
    alignItems: "center",
    paddingVertical: 28,
  },
  volverLinkText: {
    fontSize: 14,
    color: "#6B7280",
  },
});