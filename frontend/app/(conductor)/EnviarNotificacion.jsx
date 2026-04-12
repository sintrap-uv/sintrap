import {use, useEffect, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator,
  Switch, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { enviarNotificacionConductor } from "../../services/notificacionesServices";
import { getProfile } from "../../services/profileService";
import { getCurrentUser } from "../../services/auth";
import theme from "../../constants/theme";

const t = theme.lightMode

const TIPOS = [
    {key: "retraso_bus", label: "Retraso en Bus"},
    {key: "inicio_turno", label: "Inicio de Turno"},
    {key: "fin_turno", label: "Fin de Turno"},
    {key:"incidente", label: "Incidente en Ruta"},
]

export default function EnviarNotificacion() {
    const router = useRouter()
    const [user, setUser ] = useState(null)
    const [perfil, setPerfil] = useState(null)
    const {tipoSeleccionado, setTipoSeleccionado} = useState(TIPOS[0])
    const [mensaje, setMensaje] = useState("")
    const {loading, setLoading} = useState(false)

    useEffect(() => {
        const getUser = async () => {
            const{data} = await getCurrentUser()
            const usuario = data?.user
            setUser(usuario)

            if (usuario?.id) {
                const {data: perfilData} = await getProfile(usuario.id)
                setPerfil(perfilData)
            }
        }
        getUser()
    },[])


    const handleEnviar = async () => {
        if (!mensaje.trim()) {
            alert("El mensaje no puede estar vacío")
            return
        }

        setLoading(true)
        const { error } = await enviarNotificacionConductor({
            conductorId: user.id,
            conductorNombre: perfil?.nombre ?? "Conductor",
            cedular: perfil?.cedula ?? "-",
            telefono: perfil?.telefono ?? "-",
            tipo: tipoSeleccionado.key,
            titulo: tipoSeleccionado.label,
            mensaje: mensaje.trim(),
        })
        setLoading(false)
        
        if (error) {
            alert("Error al enviar la notificación: " + error.message)
        } else {
            alert("Notificación enviada exitosamente")
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
          <Text style={styles.headerTitulo}>Enviar notificación</Text>
          <Text style={styles.headerSub}>Al administrador</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Selector de tipo */}
        <Text style={styles.seccionLabel}>Tipo de notificación</Text>
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
            placeholder="Describe la situación..."
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
          <View style={styles.previewHeader}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={20} color="#6B7280" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewNombre}>
                {profiles?.nombre ?? "Tu nombre"}
              </Text>
              <Text style={styles.previewDato}>{profiles?.cedula ?? "Cédula"}</Text>
              <Text style={styles.previewDato}>{profiles?.telefono ?? "Teléfono"}</Text>
            </View>
            {urgente && (
              <View style={styles.urgenteBadge}>
                <Text style={styles.urgenteTexto}>Urgente</Text>
              </View>
            )}
          </View>
          <View style={styles.previewMensaje}>
            <Ionicons
              name={tipoSeleccionado.icono}
              size={16}
              color={tipoSeleccionado.color}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.previewMensajeTexto}>
              {mensaje.trim() || "Tu mensaje aparecerá aquí..."}
            </Text>
          </View>
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
                <Ionicons name="send-outline" size={18} color="#fff" />
                <Text style={styles.btnEnviarTexto}>Enviar al administrador</Text>
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
  urgenteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  urgenteLabel: { fontSize: 15, fontWeight: "600", color: "#111827" },
  urgenteSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  preview: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 10,
  },
  avatarCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center", justifyContent: "center",
  },
  previewNombre: { fontSize: 14, fontWeight: "700", color: "#111827" },
  previewDato: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  urgenteBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  urgenteTexto: { color: "#fff", fontSize: 12, fontWeight: "700" },
  previewMensaje: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 10,
  },
  previewMensajeTexto: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
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