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

export default function LoginScreen() {

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleRegister = async () => {

    if (!name || !email || !password) {
      alert("Completa todos los campos")
      return
    }

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

    if (profileError) {
      alert("Error creando perfil: " + profileError.message)
    } else {
      alert("Registro exitoso")
    }
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

        <View style={styles.inputContainer}>
          <FontAwesome name="user" size={20} color="#444" />
          <TextInput
            placeholder="Nombre completo"
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#444" />
          <TextInput
            placeholder="Correo electronico"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#444" />
          <TextInput
            placeholder="Contraseña"
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleRegister}
        >
          <Text style={styles.buttonText}>Crear cuenta</Text>
        </TouchableOpacity>

        <Text style={styles.forgot}>¿Olvidaste tu contraseña?</Text>

        <TouchableOpacity>
          <Text style={styles.register}>Iniciar sesión</Text>
        </TouchableOpacity>

      </View>
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
    marginBottom: 15,
    width: "100%",
    height: 45
  },

  input: {
    marginLeft: 10,
    flex: 1
  },

  button: {
    marginTop: 20,
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
  }
})