import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { useRouter } from "expo-router"
import { supabase } from "../../services/supabase"
import { getCurrentUser } from "../../services/auth"
import { getProfile } from "../../services/profileService"
import theme from "../../constants/theme"

const t = theme.lightMode

const TIPOS = [
  { key: "alerta_general",  label: "Retraso en Bus",    icono: "time-outline",        color: "#F59E0B" },
  { key: "sistema_inicio",         label: "Inicio de Turno",   icono: "play-circle-outline", color: "#16A34A" },
  { key: "sistema_fin",         label: "Fin de Turno",      icono: "stop-circle-outline", color: "#6B7280" },
  { key: "alerta_suspension",  label: "Incidente en Ruta", icono: "warning-outline",     color: "#EF4444" },
]

export default function EnviarAviso() {
  const router = useRouter()
  const [perfil, setPerfil] = useState(null)
  const [tipoSeleccionado, setTipoSeleccionado] = useState(TIPOS[0])
  const [mensaje, setMensaje] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const { data } = await getCurrentUser()
      const usuario = data?.user
      if (usuario?.id) {
        const { data: perfilData } = await getProfile(usuario.id)
        setPerfil(perfilData)
      }
    }
    cargar()
  }, [])

  const handleEnviar = async () => {
    if (!mensaje.trim()) {
      alert("Escribe un mensaje antes de enviar.")
      return
    }

    setLoading(true)
    const { data: usuarios, error: errorUsuarios } = await supabase
      .from("profiles")
      .select("id")

    if (errorUsuarios || !usuarios?.length) {
      alert("Error obteniendo usuarios: " + errorUsuarios?.message)
      setLoading(false)
      return
    }
    const notificaciones = usuarios.map((u) => ({
      usuario_id: u.id,
      tipo: tipoSeleccionado.key,
      titulo: tipoSeleccionado.label,
      mensaje: mensaje.trim(),
      metadata: {
        enviado_por: perfil?.nombre ?? "Administrador",
        rol_emisor: "administrador",
      },
      leida: false,
      fecha: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from("notificaciones")
      .insert(notificaciones)

    setLoading(false)

    if (error) {
      alert("Error al enviar: " + error.message)
    } else {
      alert(`Aviso enviado a ${usuarios.length} usuarios.`)
      setMensaje("")
      router.back()
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={t.Headers?.gradientColors ?? ["#16A34A", "#22C55E"]}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitulo}>Crear aviso</Text>
          <Text style={styles.headerSub}>Se enviará a todos los usuarios</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Selector de tipo */}
        <Text style={styles.seccionLabel}>Tipo de aviso</Text>
        <View style={styles.tiposGrid}>
          {TIPOS.map((tipo) => {
            const seleccionado = tipoSeleccionado.key === tipo.key
            return (
              <TouchableOpacity
                key={tipo.key}
                style={[
                  styles.tipoBtn,
                  seleccionado && { borderColor: tipo.color, backgroundColor: tipo.color + "12" }
                ]}
                onPress={() => setTipoSeleccionado(tipo)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tipo.icono}
                  size={22}
                  color={seleccionado ? tipo.color : "#9CA3AF"}
                />
                <Text style={[
                  styles.tipoBtnTexto,
                  seleccionado && { color: tipo.color, fontWeight: "600" }
                ]}>
                  {tipo.label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Mensaje */}
        <Text style={styles.seccionLabel}>Mensaje</Text>
        <View style={styles.mensajeWrapper}>
          <TextInput
            style={styles.mensajeInput}
            placeholder="Describe la situación para los usuarios..."
            placeholderTextColor="#9CA3AF"
            value={mensaje}
            onChangeText={setMensaje}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Vista previa */}
        <Text style={styles.seccionLabel}>Vista previa</Text>
        <View style={styles.preview}>
          <View style={styles.previewTipoRow}>
            <Ionicons
              name={tipoSeleccionado.icono}
              size={18}
              color={tipoSeleccionado.color}
            />
            <Text style={[styles.previewTipo, { color: tipoSeleccionado.color }]}>
              {tipoSeleccionado.label}
            </Text>
          </View>
          <Text style={styles.previewMensaje}>
            {mensaje.trim() || "Tu mensaje aparecerá aquí..."}
          </Text>
          <Text style={styles.previewEmisor}>
            Enviado por: {perfil?.nombre ?? "Administrador"}
          </Text>
        </View>

        {/* Botón enviar */}
        <TouchableOpacity
          style={[styles.btnEnviar, loading && styles.btnDisabled]}
          onPress={handleEnviar}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <>
                <Ionicons name="megaphone-outline" size={18} color="#fff" />
                <Text style={styles.btnEnviarTexto}>Enviar a todos los usuarios</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  scroll: { padding: 16 },
  seccionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 10,
    marginTop: 20,
    letterSpacing: 0.4,
  },
  tiposGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tipoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  tipoBtnTexto: { fontSize: 13, color: "#9CA3AF" },
  mensajeWrapper: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
  },
  mensajeInput: {
    fontSize: 15,
    color: "#111827",
    minHeight: 100,
  },
  preview: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  previewTipoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  previewTipo: { fontSize: 14, fontWeight: "700" },
  previewMensaje: { fontSize: 13, color: "#374151", lineHeight: 18 },
  previewEmisor: { fontSize: 11, color: "#9CA3AF", marginTop: 4 },
  btnEnviar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnEnviarTexto: { color: "#fff", fontSize: 16, fontWeight: "700" },
})