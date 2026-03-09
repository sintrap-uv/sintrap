import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity } from "react-native"
import { supabase } from "../../services/supabase"

export default function ResetPassword() {

  const [password, setPassword] = useState("")

  const handleUpdatePassword = async () => {

    const { error } = await supabase.auth.updateUser({
      password: password
    })

    if (error) {
      alert("Error: " + error.message)
    } else {
      alert("Contraseña actualizada")
    }

  }

  return (
    <View>

      <Text>Nueva contraseña</Text>

      <TextInput
        placeholder="Nueva contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity onPress={handleUpdatePassword}>
        <Text>Actualizar contraseña</Text>
      </TouchableOpacity>

    </View>
  )

}

