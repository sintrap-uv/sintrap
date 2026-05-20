import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import theme from "../../constants/theme";
import { Ionicons } from "@expo/vector-icons";

import {
  getOcupacionVehiculos,
  getConductoresActivos,
  getConductoresActivosTendencia,
  getRutasCompletadosCancelados,
  getDistribucionTurnos,
  getOcupacionRutas,
  getEstadoVehiculos,
  obtenerRangoFechas,
} from "../../services/estadisticasService";

import GraficaOcupacionVehiculos from "../../components/estadisticas/GraficaOcupacionVehiculos";
import GraficaConductoresActivos from "../../components/estadisticas/GraficaConductoresActivos";
import GraficaRutasEstado from "../../components/estadisticas/GraficaRutasEstado";
import GraficaDistribucionTurnos from "../../components/estadisticas/GraficaDistribucionTurnos";
import GraficaOcupacionRutas from "../../components/estadisticas/GraficaOcupacionRutas";
import GraficaEstadoVehiculos from "../../components/estadisticas/GraficaEstadoVehiculos";
import PeriodoSelector from "../../components/estadisticas/PeriodoSelector";

const T = theme.lightMode;

export default function EstadisticasScreen() {
  const insets = useSafeAreaInsets();
  const [periodo, setPeriodo] = useState("mes");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [ocupacionVehiculos, setOcupacionVehiculos] = useState([]);
  const [conductoresActivos, setConductoresActivos] = useState(0);
  const [conductoresActivosTend, setConductoresActivosTend] = useState([]);
  const [rutasEstado, setRutasEstado] = useState([]);
  const [distribucionTurnos, setDistribucionTurnos] = useState([]);
  const [ocupacionRutas, setOcupacionRutas] = useState([]);
  const [estadoVehiculos, setEstadoVehiculos] = useState({
    resumen: [],
    detalles: [],
  });

  useEffect(() => {
    cargarTodosDatos();
  }, [periodo]);

  const cargarTodosDatos = async () => {
    try {
      setCargando(true);
      setError(null);

      const { inicio, fin } = obtenerRangoFechas(periodo);

      const [
        ocupacion,
        conductores,
        conductoresTend,
        rutas,
        distribucion,
        ocupRutas,
        estado,
      ] = await Promise.all([
        getOcupacionVehiculos(inicio, fin),
        getConductoresActivos(inicio, fin),
        getConductoresActivosTendencia(inicio, fin),
        getRutasCompletadosCancelados(inicio, fin),
        getDistribucionTurnos(inicio, fin),
        getOcupacionRutas(inicio, fin),
        getEstadoVehiculos(inicio, fin),
      ]);

      setOcupacionVehiculos(ocupacion);
      setConductoresActivos(conductores);
      setConductoresActivosTend(conductoresTend);
      setRutasEstado(rutas);
      setDistribucionTurnos(distribucion);
      setOcupacionRutas(ocupRutas);
      setEstadoVehiculos(
        estado.success ? estado.data : { resumen: [], detalles: [] },
      );
    } catch (err) {
      setError("Error al cargar estadísticas");
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  if (cargando && !ocupacionVehiculos.length) {
    return (
      <View style={[styles.container, { backgroundColor: T.background }]}>
        <ActivityIndicator size="large" color={T.icon.active} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: T.background, paddingTop: insets.top },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <PeriodoSelector periodo={periodo} onChangePeriodo={setPeriodo} />
      </View>

      {error && (
        <View
          style={{
            padding: 16,
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            marginHorizontal: 16,
          }}
        >
          <Text style={{ color: "#ef4444" }}>{error}</Text>
        </View>
      )}

      <GraficaOcupacionVehiculos
        datos={ocupacionVehiculos}
        cargando={cargando}
      />
      <GraficaConductoresActivos
        activos={conductoresActivos}
        tendencia={conductoresActivosTend}
        cargando={cargando}
      />
      <GraficaRutasEstado datos={rutasEstado} cargando={cargando} />
      <GraficaDistribucionTurnos
        datos={distribucionTurnos}
        cargando={cargando}
      />
      <GraficaOcupacionRutas datos={ocupacionRutas} cargando={cargando} />
      <GraficaEstadoVehiculos datos={estadoVehiculos} cargando={cargando} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
});
