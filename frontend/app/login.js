import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native"

import { FontAwesome, MaterialIcons } from "@expo/vector-icons"
import { signIn } from "../services/auth"

export default function Login() {

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = async () => {

    const { data, error } = await signIn(email, password)

    if (error) {
      alert("Error al iniciar sesión: " + error.message)
    } else {
      alert("Inicio de sesión exitoso: " + data.user.email)
    }

  }

  return (
    <View style={styles.container}>

      {/* Icono */}
      <View style={styles.iconContainer}>
        <FontAwesome name="map-marker" size={60} color="#444" />
        <FontAwesome name="bus" size={24} color="#fff" style={styles.busIcon}/>
      </View>

      {/* Título */}
      <Text style={styles.title}>Bienvenido a</Text>
      <Text style={styles.titleBold}>Sintrap</Text>

      {/* Card */}
      <View style={styles.card}>

        {/* Email */}
        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#444"/>
          <TextInput
            placeholder="Correo electronico"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        {/* Password */}
        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#444"/>
          <TextInput
            placeholder="Contraseña"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {/* Botón login */}
        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>Inicio sesión</Text>
        </TouchableOpacity>

        {/* Links */}
        <Text style={styles.forgot}>
          ¿olvidaste tu contraseña?
        </Text>

        <TouchableOpacity>
          <Text style={styles.register}>
            Crear una cuenta
          </Text>
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
    marginTop: 25,
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
