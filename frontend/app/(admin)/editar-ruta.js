import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from "../../services/supabase";
import { obtenerVehiculos } from "../../services/vehicleService";
import { getAllDrivers } from "../../services/driverService";
import theme from "../../constants/theme";

const T = theme.lightMode;

export default function EditarRutaScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  // Estados para datos de la ruta
  const [nombreRuta, setNombreRuta] = useState("");
  const [numeroRuta, setNumeroRuta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState({});

  // Estados para recursos
  const [conductores, setConductores] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [turnos, setTurnos] = useState([]);
  const [conductorId, setConductorId] = useState(null);
  const [vehiculoId, setVehiculoId] = useState(null);
  const [turnoId, setTurnoId] = useState(null);
  const [horaInicio, setHoraInicio] = useState("06:00");
  const [horaFin, setHoraFin] = useState("18:00");
  const [diasTipo, setDiasTipo] = useState("entre_semana");

  // Estados para pickers
  const [mostrarPickerInicio, setMostrarPickerInicio] = useState(false);
  const [mostrarPickerFin, setMostrarPickerFin] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const [conductoresRes, vehiculosRes, turnosRes] = await Promise.all([
        getAllDrivers(),
        obtenerVehiculos(),
        supabase.from("tipos_turno").select("*").order("id"),
      ]);

      setConductores(conductoresRes.data || []);
      setVehiculos(vehiculosRes || []);
      setTurnos(turnosRes.data || []);

      const { data: rutaData } = await supabase
        .from("rutas")
        .select("*")
        .eq("id", id)
        .single();

      if (rutaData) {
        setNombreRuta(rutaData.nombre);
        setNumeroRuta(rutaData.numero_ruta?.toString());
      }

      const { data: horarioData } = await supabase
        .from("ruta_horarios")
        .select("*")
        .eq("ruta_id", id)
        .maybeSingle();

      if (horarioData) {
        setTurnoId(horarioData.tipo_turno_id);
        setVehiculoId(horarioData.vehiculo_id);
        setHoraInicio(horarioData.hora_inicio || "06:00");
        setHoraFin(horarioData.hora_fin || "18:00");

        const { data: vehiculoData } = await supabase
          .from("vehiculos")
          .select("conductor_id")
          .eq("id", horarioData.vehiculo_id)
          .single();

        if (vehiculoData) {
          setConductorId(vehiculoData.conductor_id);
        }
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
      Alert.alert("Error", "No se pudieron cargar los datos");
    } finally {
      setCargando(false);
    }
  };

  const validar = () => {
    const nuevosErrores = {};
    if (!nombreRuta.trim()) nuevosErrores.nombre = "El nombre es obligatorio";
    if (!numeroRuta.trim()) nuevosErrores.numero = "El número de ruta es obligatorio";
    else if (isNaN(parseInt(numeroRuta))) nuevosErrores.numero = "Debe ser un número";
    if (!conductorId) nuevosErrores.conductor = "Debes seleccionar un conductor";
    if (!vehiculoId) nuevosErrores.vehiculo = "Debes seleccionar un vehículo";
    if (!turnoId) nuevosErrores.turno = "Debes seleccionar un turno";
    if (horaInicio >= horaFin) nuevosErrores.hora = "La hora final debe ser mayor a la inicial";
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleGuardar = async () => {
    if (!validar()) return;

    setGuardando(true);
    try {
      const { error: errorRuta } = await supabase
        .from("rutas")
        .update({
          numero_ruta: parseInt(numeroRuta),
          nombre: nombreRuta.trim(),
        })
        .eq("id", id);

      if (errorRuta) throw errorRuta;

      const { error: errorHorario } = await supabase
        .from("ruta_horarios")
        .upsert({
          ruta_id: id,
          tipo_turno_id: turnoId,
          vehiculo_id: vehiculoId,
          hora_inicio: horaInicio,
          hora_fin: horaFin,
          activo: true,
        }, { onConflict: "ruta_id" });

      if (errorHorario) throw errorHorario;

      Alert.alert("Éxito", "Ruta actualizada correctamente", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar la ruta");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color={T.Button.primary.background} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#16A34A", "#22C55E"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitulo}>Editar Ruta</Text>
          <Text style={styles.headerSub}>Modifica los datos de la ruta</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.label}>Número de ruta</Text>
          <TextInput
            style={[styles.input, errores.numero && styles.inputError]}
            value={numeroRuta}
            onChangeText={setNumeroRuta}
            placeholder="Ej: 1, 2, 3..."
            keyboardType="numeric"
          />
          {errores.numero && <Text style={styles.errorText}>{errores.numero}</Text>}

          <Text style={styles.label}>Nombre de la ruta</Text>
          <TextInput
            style={[styles.input, errores.nombre && styles.inputError]}
            value={nombreRuta}
            onChangeText={setNombreRuta}
            placeholder="Ej: Barrios → Empresa"
          />
          {errores.nombre && <Text style={styles.errorText}>{errores.nombre}</Text>}

          <Text style={styles.labelSeccion}>Horario de la ruta</Text>
          <View style={styles.horarioRow}>
            <TouchableOpacity
              style={[styles.horarioButton, errores.hora && styles.inputError]}
              onPress={() => setMostrarPickerInicio(true)}
            >
              <Text style={styles.horarioText}>{horaInicio}</Text>
            </TouchableOpacity>
            <Text style={styles.horarioSeparador}>-</Text>
            <TouchableOpacity
              style={[styles.horarioButton, errores.hora && styles.inputError]}
              onPress={() => setMostrarPickerFin(true)}
            >
              <Text style={styles.horarioText}>{horaFin}</Text>
            </TouchableOpacity>
          </View>
          {errores.hora && <Text style={styles.errorText}>{errores.hora}</Text>}

          {mostrarPickerInicio && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, date) => {
                setMostrarPickerInicio(false);
                if (date) {
                  const h = String(date.getHours()).padStart(2, "0");
                  const m = String(date.getMinutes()).padStart(2, "0");
                  setHoraInicio(`${h}:${m}`);
                }
              }}
            />
          )}

          {mostrarPickerFin && (
            <DateTimePicker
              value={new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={(event, date) => {
                setMostrarPickerFin(false);
                if (date) {
                  const h = String(date.getHours()).padStart(2, "0");
                  const m = String(date.getMinutes()).padStart(2, "0");
                  setHoraFin(`${h}:${m}`);
                }
              }}
            />
          )}

          <Text style={styles.labelSeccion}>Conductor</Text>
          <View style={[styles.selectorContenedor, errores.conductor && styles.inputError]}>
            <Picker
              selectedValue={conductorId}
              onValueChange={(v) => setConductorId(v)}
              style={{ color: T.input.text }}
            >
              <Picker.Item label="Selecciona un conductor..." value={null} />
              {conductores.map((c) => (
                <Picker.Item key={c.id} label={c.nombre} value={c.id} />
              ))}
            </Picker>
          </View>
          {errores.conductor && <Text style={styles.errorText}>{errores.conductor}</Text>}

          <Text style={styles.labelSeccion}>Vehículo</Text>
          <View style={[styles.selectorContenedor, errores.vehiculo && styles.inputError]}>
            <Picker
              selectedValue={vehiculoId}
              onValueChange={(v) => setVehiculoId(v)}
              style={{ color: T.input.text }}
            >
              <Picker.Item label="Selecciona un vehículo..." value={null} />
              {vehiculos.map((v) => (
                <Picker.Item key={v.id} label={`${v.placa} - ${v.tipo_vehiculo?.nombre || "Sin tipo"}`} value={v.id} />
              ))}
            </Picker>
          </View>
          {errores.vehiculo && <Text style={styles.errorText}>{errores.vehiculo}</Text>}

          <Text style={styles.labelSeccion}>Turno</Text>
          <View style={[styles.selectorContenedor, errores.turno && styles.inputError]}>
            <Picker
              selectedValue={turnoId}
              onValueChange={(v) => setTurnoId(v)}
              style={{ color: T.input.text }}
            >
              <Picker.Item label="Selecciona un turno..." value={null} />
              {turnos.map((t) => (
                <Picker.Item key={t.id} label={`${t.nombre} (${t.hora_inicio} - ${t.hora_fin})`} value={t.id} />
              ))}
            </Picker>
          </View>
          {errores.turno && <Text style={styles.errorText}>{errores.turno}</Text>}

          <Text style={styles.labelSeccion}>Días de operación</Text>
          <View style={styles.selectorContenedor}>
            <Picker selectedValue={diasTipo} onValueChange={setDiasTipo} style={{ color: T.input.text }}>
              <Picker.Item label="Entre semana (Lun - Vie)" value="entre_semana" />
              <Picker.Item label="Fines de semana (Sab - Dom)" value="fines_semana" />
              <Picker.Item label="Todos los días" value="todos" />
            </Picker>
          </View>

          <TouchableOpacity style={styles.guardarBtn} onPress={handleGuardar} disabled={guardando}>
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.guardarBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.background },
  centrado: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  backBtn: { padding: 4 },
  headerTitulo: { fontSize: 22, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  scroll: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  label: { fontSize: 14, fontWeight: "600", color: T.text.secondary, marginBottom: 6, marginTop: 12 },
  labelSeccion: { fontSize: 15, fontWeight: "600", color: T.text.primary, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: T.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: T.text.primary,
    borderWidth: 1,
    borderColor: T.input.border,
  },
  inputError: { borderColor: "#EF4444", borderWidth: 1.5 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4, marginLeft: 4 },
  horarioRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  horarioButton: {
    flex: 1,
    backgroundColor: T.background,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: T.input.border,
  },
  horarioText: { fontSize: 16, color: T.text.primary },
  horarioSeparador: { fontSize: 16, color: T.text.secondary },
  selectorContenedor: {
    borderWidth: 1,
    borderColor: T.input.border,
    borderRadius: 12,
    backgroundColor: T.background,
    marginBottom: 4,
    overflow: "hidden",
  },
  guardarBtn: {
    backgroundColor: T.Button.primary.background,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 24,
  },
  guardarBtnText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});