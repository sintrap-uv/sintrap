import { Stack, useRouter, useSegments } from "expo-router";
import Header from "../../components/Header";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  const segments = useSegments();
  const router = useRouter();

  // Detectar la pantalla actual
  const ruta = segments[segments.length - 1];

  // Configuración dinámica del header
  let titulo = "Administrador";
  let subtitulo = "Panel Principal";
  let mode = "light";
  let iconsName = "arrow-back-outline";

  if (ruta === "registrar-vehiculo") {
    titulo = "Registrar Bus";
    subtitulo = "Agregar un nuevo Bus";
    mode = "light";
    iconsName = "arrow-back-outline";

  }

  if (ruta === "DashboardAdmin") {
    titulo = "Dashboard";
    subtitulo = "Bienvenido";
    mode = "light";
    iconsName = "settings-outline";
  }

  return (
  <>
      <Header
        titulo={titulo}
        subtitulo={subtitulo}
        mode={mode}
        iconoDerecha={
          <TouchableOpacity onPress={() => router.replace('/home')}>
            <Ionicons name={iconsName} size={36} color="#fff" />
          </TouchableOpacity>
        }
      
      />

      <Stack
        screenOptions={{
          headerShown: false, // Ocultamos el header nativo 
        }}
      />
  </>
  );
}
