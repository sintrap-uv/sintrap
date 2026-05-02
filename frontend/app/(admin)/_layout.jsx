import { Stack, useRouter, useSegments } from "expo-router";
import Header from "../../components/Header";
import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function AdminLayout() {
  const segments = useSegments();
  const router = useRouter();

  const ruta = segments[segments.length - 1];

  let titulo = "Administrador";
  let subtitulo = "Panel Principal";
  let mode = "light";
  let iconsName = "arrow-back-outline";
  let mostrarHeader = true;

  if (ruta === "registrar-vehiculo") {
    titulo = "Registrar Bus";
    subtitulo = "Agregar un nuevo Bus";
  }

  if (ruta === "DashboardAdmin") {
    titulo = "Dashboard";
    subtitulo = "Bienvenido";
    iconsName = "settings-outline";
  }

  if (ruta === "rutas") {
    titulo = "Gestión de Rutas";
    subtitulo = "Administra las rutas del sistema";
  }

  if (ruta === "asignar-recursos") {
    mostrarHeader = false; // La pantalla de asignación tiene su propio header
  }

  if (ruta === "conductores") {
    titulo = "Conductores";
    subtitulo = "Gestión de conductores";
  }

  return (
    <>
      {mostrarHeader && (
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
      )}
  
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="asignar-recursos" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
