import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../services/supabase";
import theme from "../../constants/theme";

const t = theme.lightMode;

export default function VerificarCodigo({ email, onVerificado, onVolver }) {
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerificar = async () => {
    if (codigo.length < 6) {
      alert("Ingresa el código de 6 dígitos.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: "email",
    });
    setLoading(false);

    if (error) {
      alert("Código incorrecto o expirado.");
    } else {
      onVerificado(); // sesión activa, navega a cambiar contraseña
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LinearGradient
        colors={t.Headers?.gradientColors ?? ["#16A34A", "#22C55E"]}
        style={styles.header}
      >
        <View style={styles.busIcon}>
          <Ionicons name="bus" size={28} color="#fff" />
        </View>
        <Text style={styles.headerTitle}>Bienvenido a{"\n"}Sintrap</Text>
      </LinearGradient>

      <Text style={styles.tituloFlotante}>Verificar código</Text>

      <View style={styles.card}>
        <Text style={styles.descripcion}>
          Ingresa el código de 8 dígitos que enviamos a{" "}
          <Text style={{ fontWeight: "600", color: "#111827" }}>{email}</Text>
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons name="key-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { letterSpacing: 10, fontSize: 18 }]}
            placeholder="00000000"
            placeholderTextColor="#9CA3AF"
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={8}
          />
        </View>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleVerificar}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Verificar</Text>
          }
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onVolver} activeOpacity={0.7} style={styles.volverLink}>
        <Text style={styles.volverTexto}>← Volver</Text>
      </TouchableOpacity>

    </KeyboardAvoidingView>
  );
}