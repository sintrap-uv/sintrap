import React, { useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet
} from "react-native"

import { FontAwesome, MaterialIcons } from "@expo/vector-icons"
import { resetPassword } from "../../services/auth"

export default function ForgotPassword({ navigation }) {

  const [email, setEmail] = useState("")

  const handleReset = async () => {

    const { error } = await resetPassword(email)

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Revisa tu correo para cambiar la contraseña")
      navigation.goBack()
    }

  }

  return (
    <View style={styles.container}>

      {/* icono */}
      <View style={styles.iconContainer}>
        <FontAwesome name="map-marker" size={60} color="#444"/>
        <FontAwesome name="bus" size={24} color="#fff" style={styles.busIcon}/>
      </View>

      <Text style={styles.title}>Recuperar contraseña</Text>

      {/* Card */}
      <View style={styles.card}>

        <View style={styles.inputContainer}>
          <MaterialIcons name="email" size={20} color="#444"/>
          <TextInput
            placeholder="Correo electrónico"
            style={styles.input}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleReset}
        >
          <Text style={styles.buttonText}>
            Enviar enlace
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.back}>
            Volver al login
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
    fontSize: 26,
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
    marginBottom: 20,
    width: "100%",
    height: 45
  },

  input: {
    marginLeft: 10,
    flex: 1
  },

  button: {
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

  back: {
    marginTop: 15,
    color: "#8B0000",
    fontWeight: "bold"
  }

})