import { signUp } from "../../services/auth"
import { createProfile } from "../../services/profileService"
import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native"
import { FontAwesome, MaterialIcons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

export default function LoginScreen() {

  const [name,            setName]            = useState("")
  const [email,           setEmail]           = useState("")
  const [password,        setPassword]        = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword,    setShowPassword]    = useState(false)
  const [showConfirm,     setShowConfirm]     = useState(false)
  const [errores,         setErrores]         = useState({})
  const router = useRouter()

  // ── Validaciones ──
  const validar = () => {
    const e = {}
    if (!name.trim())
      e.name = "El nombre es obligatorio"
    if (!email.trim())
      e.email = "El correo es obligatorio"
    else if (!/\S+@\S+\.\S+/.test(email))
      e.email = "El correo no es válido"
    if (!password)
      e.password = "La contraseña es obligatoria"
    else if (password.length < 8)
      e.password = "Mínimo 8 caracteres"
    else if (!/[A-Z]/.test(password))
      e.password = "Debe tener al menos 1 mayúscula"
    else if (!/[0-9]/.test(password))
      e.password = "Debe tener al menos 1 número"
    if (!confirmPassword)
      e.confirmPassword = "Confirma tu contraseña"
    else if (password !== confirmPassword)
      e.confirmPassword = "Las contraseñas no coinciden"
    setErrores(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async () => {

    if (!validar()) return

    const { data, error } = await signUp(email, password)

    if (error) {
      alert("Error al registrarse: " + error.message)
      return
    }

    const user = data.user

    if (!user) {
      alert("No se pudo crear el usuario")
      return
    }

    const { error: profileError } = await createProfile({
      id: user.id,
      nombre: name,
      rol: "usuario",
      activo: true
    })

    // ✅ Fix duplicate key
    if (profileError && !profileError.message.includes("duplicate")) {
      alert("Error creando perfil: " + profileError.message)
      return
    }

    alert("Registro exitoso")
  
  }

  return (
    <View style={styles.container}>

      <View style={styles.iconContainer}>
        <FontAwesome name="map-marker" size={60} color="#444" />
        <FontAwesome name="bus" size={24} color="#fff" style={styles.busIcon}/>
      </View>

      <Text style={styles.title}>Bienvenido a</Text>
      <Text style={styles.titleBold}>Sintrap</Text>

      <View style={styles.card}>

        {/* Nombre */}
        <View style={styles.inputContainer}>
          <FontAwesome name="user" size={20} color="#444" />
          <TextInput
            placeholder="Nombre completo"
            style={styles.input}
            value={name}
            onChangeText={(v) => { setName(v); setErrores((p) => ({ ...p, name: undefined })) }}
          />
        </View>
        {errores.name && <Text style={styles.error}>{errores.name}</Text>}

        {/* Email */}
        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#444" />
          <TextInput
            placeholder="Correo electronico"
            style={styles.input}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrores((p) => ({ ...p, email: undefined })) }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        {errores.email && <Text style={styles.error}>{errores.email}</Text>}

        {/* Contraseña */}
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#444" />
          <TextInput
            placeholder="Contraseña"
            style={styles.input}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(v) => { setPassword(v); setErrores((p) => ({ ...p, password: undefined })) }}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <FontAwesome name={showPassword ? "eye-slash" : "eye"} size={18} color="#888" />
          </TouchableOpacity>
        </View>
        {errores.password && <Text style={styles.error}>{errores.password}</Text>}

        {/* Confirmar contraseña */}
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#444" />
          <TextInput
            placeholder="Confirmar contraseña"
            style={styles.input}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setErrores((p) => ({ ...p, confirmPassword: undefined })) }}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <FontAwesome name={showConfirm ? "eye-slash" : "eye"} size={18} color="#888" />
          </TouchableOpacity>
        </View>
        {errores.confirmPassword && <Text style={styles.error}>{errores.confirmPassword}</Text>}

        {/* Requisitos de contraseña */}
        <View style={styles.requisitos}>
          <Requisito ok={password.length >= 8}   texto="Mínimo 8 caracteres" />
          <Requisito ok={/[A-Z]/.test(password)} texto="Al menos 1 mayúscula" />
          <Requisito ok={/[0-9]/.test(password)} texto="Al menos 1 número" />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
        >
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.register}>¿Ya tienes una cuenta?</Text>
        </TouchableOpacity>

      </View>
    </View>
  )
}

// ── Componente de requisito ──
function Requisito({ ok, texto }) {
  return (
    <View style={styles.requisitoRow}>
      <FontAwesome
        name={ok ? "check-circle" : "circle-o"}
        size={13}
        color={ok ? "#0d5b0d" : "#aaa"}
      />
      <Text style={[styles.requisitoTexto, ok && styles.requisitoOk]}>
        {texto}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#d9d9d9",
    alignItems: "center",
    justifyContent: "center"
  },

  iconContainer: {
    alignItems: "center",
    marginBottom: 10
  },

  busIcon: {
    position: "absolute",
    top: 18
  },

  title: {
    fontSize: 22,
    fontWeight: "500",
    color: "#333"
  },

  titleBold: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20
  },

  card: {
    width: "85%",
    backgroundColor: "#f5f5f5",
    borderRadius: 25,
    padding: 25,
    alignItems: "center"
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eee",
    borderRadius: 20,
    paddingHorizontal: 15,
    marginBottom: 4,
    width: "100%",
    height: 45
  },

  input: {
    marginLeft: 10,
    flex: 1
  },

  button: {
    marginTop: 12,
    backgroundColor: "#0d5b0d",
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 25
  },

  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold"
  },

  forgot: {
    marginTop: 20,
    color: "#0d5b0d",
    fontWeight: "600"
  },

  register: {
    marginTop: 8,
    color: "#8B0000",
    fontWeight: "bold"
  },

  error: {
    color: "#DC2626",
    fontSize: 12,
    alignSelf: "flex-start",
    marginLeft: 8,
    marginBottom: 6,
  },
  requisitos: {
    alignSelf: "flex-start",
    marginLeft: 8,
    marginTop: 4,
    marginBottom: 8,
    gap: 4,
  },
  requisitoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  requisitoTexto: {
    fontSize: 12,
    color: "#aaa",
  },
  requisitoOk: {
    color: "#0d5b0d",
  },
})