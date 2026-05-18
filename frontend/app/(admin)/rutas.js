import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../../services/supabase";
import theme from "../../constants/theme";
import Header from "../../components/Header";

const T = theme.lightMode;

export default function TodasLasRutasScreen() {
  const router = useRouter();
  const [rutas, setRutas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);

  const cargarRutas = async (esRefresh = false) => {
    if (esRefresh) setRefrescando(true);
    else setCargando(true);

    try {
      const { data: rutasData } = await supabase
        .from("rutas")
        .select("*")
        .eq("activa", true)
        .order("numero_ruta");

      if (!rutasData || rutasData.length === 0) {
        setRutas([]);
        setCargando(false);
        setRefrescando(false);
        return;
      }

      const { data: asignaciones } = await supabase
        .from("ruta_horarios")
        .select(`
          ruta_id,
          tipo_turno_id,
          vehiculos!vehiculo_id (
            id,
            placa,
            tipo_vehiculo:tipo_vehiculo_id (
              nombre,
              capacidad_max
            )
          ),
          tipos_turno:tipo_turno_id (
            id,
            nombre,
            hora_inicio,
            hora_fin
          )
        `);

      const { data: usuariosAsignados } = await supabase
        .from("usuario_ruta")
        .select("ruta_id, turno_id");

      const conteoUsuarios = {};
      usuariosAsignados?.forEach(u => {
        const key = `${u.ruta_id}_${u.turno_id}`;
        conteoUsuarios[key] = (conteoUsuarios[key] || 0) + 1;
      });

      const rutasConDetalles = rutasData.map(ruta => {
        const asignacionesRuta = asignaciones?.filter(a => a.ruta_id === ruta.id) || [];

        const turnos = asignacionesRuta.map(asig => {
          const capacidad = asig.vehiculos?.tipo_vehiculo?.capacidad_max || 0;
          const key = `${ruta.id}_${asig.tipo_turno_id}`;
          const usuariosEnTurno = conteoUsuarios[key] || 0;
          const porcentaje = capacidad > 0 ? Math.round((usuariosEnTurno / capacidad) * 100) : 0;

          return {
            id: asig.tipo_turno_id,
            nombre: asig.tipos_turno?.nombre,
            hora_inicio: asig.tipos_turno?.hora_inicio,
            hora_fin: asig.tipos_turno?.hora_fin,
            vehiculo: asig.vehiculos,
            capacidad: capacidad,
            usuariosAsignados: usuariosEnTurno,
            porcentaje: porcentaje,
          };
        });

        return {
          ...ruta,
          turnos: turnos || [], // ✅ Asegurar que turnos sea un array
        };
      });

      setRutas(rutasConDetalles);
    } catch (error) {
      console.error("Error cargando rutas:", error);
    } finally {
      setCargando(false);
      setRefrescando(false);
    }
  };

  const handleEditarRuta = (ruta) => {
    router.push({
      pathname: "/(admin)/editar-ruta",
      params: {
        id: ruta.id,
        numero_ruta: ruta.numero_ruta,
        nombre: ruta.nombre,
      },
    });
  };

  const handleEliminarRuta = (ruta) => {
    Alert.alert(
      "Eliminar ruta",
      `¿Estás seguro de que deseas eliminar la ruta "${ruta.nombre}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("rutas")
                .delete()
                .eq("id", ruta.id);

              if (error) throw error;

              Alert.alert("Éxito", "Ruta eliminada correctamente");
              cargarRutas(true);
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar la ruta");
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      cargarRutas();
    }, [])
  );

  const renderRuta = ({ item: ruta }) => {
    // ✅ Validación de seguridad
    const turnos = ruta.turnos || [];
    
    return (
      <View style={styles.rutaCard}>
        <View style={styles.rutaHeader}>
          <Text style={styles.rutaNombre}>
            Ruta {ruta.numero_ruta} · {ruta.nombre}
          </Text>
          <View style={styles.accionesHeader}>
            <TouchableOpacity onPress={() => handleEditarRuta(ruta)} style={styles.btnEditar}>
              <Ionicons name="pencil-outline" size={18} color="#3B82F6" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleEliminarRuta(ruta)} style={styles.btnEliminar}>
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.turnosTitulo}>Turnos y vehículos asignados:</Text>

        {turnos.length > 0 ? (
          turnos.map((turno, idx) => {
            const colorPorcentaje = turno.porcentaje >= 90 ? "#EF4444" : turno.porcentaje >= 70 ? "#F97316" : "#22C55E";

            return (
              <View key={idx} style={styles.turnoCard}>
                <View style={styles.turnoHeader}>
                  <MaterialCommunityIcons name="clock-outline" size={16} color="#6B7280" />
                  <Text style={styles.turnoNombre}>{turno.nombre}</Text>
                  <Text style={styles.turnoHorario}>
                    {turno.hora_inicio?.slice(0, 5)} - {turno.hora_fin?.slice(0, 5)}
                  </Text>
                </View>

                {turno.vehiculo ? (
                  <>
                    <View style={styles.vehiculoInfo}>
                      <MaterialCommunityIcons name="bus" size={14} color={T.Button.primary.background} />
                      <Text style={styles.vehiculoPlaca}>{turno.vehiculo.placa}</Text>
                      <Text style={styles.vehiculoCapacidad}>Cap: {turno.capacidad} personas</Text>
                    </View>

                    <View style={styles.ocupacionInfo}>
                      <Text style={styles.usuariosTexto}>
                        {turno.usuariosAsignados} / {turno.capacidad} usuarios
                      </Text>
                      <View style={styles.barraFondo}>
                        <View style={[styles.barraRelleno, { width: `${Math.min(turno.porcentaje, 100)}%`, backgroundColor: colorPorcentaje }]} />
                      </View>
                      <Text style={[styles.porcentajeTexto, { color: colorPorcentaje }]}>
                        {turno.porcentaje}% ocupado
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={styles.sinVehiculo}>Sin vehículo asignado</Text>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.sinVehiculo}>No hay turnos configurados</Text>
        )}
      </View>
    );
  };

  if (cargando && !refrescando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={T.Button.primary.background} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header
        titulo="Gestión de Rutas"
        subtitulo={`${rutas.length} rutas activas`}
      />

      <FlatList
        data={rutas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRuta}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl
            refreshing={refrescando}
            onRefresh={() => cargarRutas(true)}
            colors={[T.Button.primary.background]}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 32, gap: 16 },

  rutaCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  rutaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rutaDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  rutaNombre: {
    fontSize: 16,
    fontWeight: "600",
    color: T.text.primary,
    flex: 1,
  },
  accionesHeader: {
    flexDirection: "row",
    gap: 12,
  },
  btnEditar: { padding: 4 },
  btnEliminar: { padding: 4 },
  turnosTitulo: {
    fontSize: 13,
    fontWeight: "600",
    color: T.text.secondary,
    marginBottom: 8,
  },
  turnoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  turnoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  turnoNombre: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text.primary,
  },
  turnoHorario: {
    fontSize: 12,
    color: "#6B7280",
  },
  vehiculoInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  vehiculoPlaca: {
    fontSize: 14,
    fontWeight: "500",
    color: T.text.primary,
  },
  vehiculoCapacidad: {
    fontSize: 12,
    color: "#6B7280",
  },
  ocupacionInfo: {
    marginTop: 4,
  },
  usuariosTexto: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  barraFondo: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  barraRelleno: {
    height: 6,
    borderRadius: 3,
  },
  porcentajeTexto: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
  },
  sinVehiculo: {
    fontSize: 12,
    color: "#EF4444",
    marginBottom: 8,
  },
});