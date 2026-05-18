import { Stack, useRouter, useSegments } from "expo-router";
import Header from "../../components/Header";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  const segments = useSegments();
  const router = useRouter();

  const ruta = segments[segments.length - 1];
  const mostrarHeader = ruta === "DashboardAdmin";

  return (
    <>
      {mostrarHeader && (
        <Header
          titulo="Panel Administrador"
          subtitulo="Gestiona rutas y buses"
          mode="light"
          iconoDerecha={
            <TouchableOpacity onPress={() => router.replace('/home')}>
              <Ionicons name="settings-outline" size={36} color="#fff" />
            </TouchableOpacity>
          }
        />
      )}

      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}