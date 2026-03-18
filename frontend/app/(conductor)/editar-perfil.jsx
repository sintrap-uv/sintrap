import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";

// Componente del formulario
import EditarPerfilForm from "../../components/forms/EditarPerfilForm";

import { getCurrentUser } from '../../services/auth';
import { getProfile } from '../../services/profileService';

export default function EditarPerfilScreen() {
  const [perfil, setPerfil] = useState(null);
  const [userId, setUserId] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // ── Cargar perfil al montar la pantalla ───────────────────
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    setError(null);

    try {
      // Obtner usuario autenticado desde supabase 
      const { data: authData, error: authError } = await getCurrentUser();
      if (authError) throw new Error('No se pudo obtener el usuario: ' + authError.message);

      const user = authData?.user;
      if (!user) throw new Error('No hay sesión activa. Inicia sesión primero.');

      setUserId(user.id);

      // Obtener perfil desde la tabla profiles
      const { data: perfilData, error: perfilError } = await getProfile(user.id);
      if (perfilError) throw new Error('No se pudo cargar el perfil: ' + perfilError.message);

      setPerfil(perfilData);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  // ── Callback cuando se guarda exitosamente ────────────────
  const handleGuardado = (perfilActualizado) => {
    setPerfil(perfilActualizado);
    // Opcional: volver atrás después de guardar
    // router.back();
  };

  // ── Estados de carga y error ──────────────────────────────
  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1B4FD8" />
        <Text style={styles.textoEstado}>Cargando perfil...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centrado}>
        <Text style={styles.textoError}>{error}</Text>
        <TouchableOpacity onPress={cargarDatos} style={styles.botonReintentar}>
          <Text style={styles.botonReintentarTexto}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render principal ──────────────────────────────────────
  return (
    <View style={styles.pantalla}>
      <EditarPerfilForm
        perfilInicial={perfil}
        userId={userId}
        onGuardado={handleGuardado}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F9FAFB",
  },
  textoEstado: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  textoError: {
    fontSize: 15,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 12,
  },
  botonReintentar: {
    backgroundColor: '#1B5E20', paddingHorizontal: 24,
    paddingVertical: 10, borderRadius: 8,
  },
  botonReintentarTexto: { color: '#fff', fontWeight: '600' },
});
