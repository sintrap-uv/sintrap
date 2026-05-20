import React, { useState, useEffect } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import theme from "../../constants/theme";
import Header from "../../components/Header";

import {
  getOcupacionVehiculos,
  getConductoresActivos,
  getConductoresActivosTendencia,
  getRutasCompletadosCancelados,
  getReportesPorTipo,
  getDistribucionTurnos,
  getOcupacionRutas,
  getTendenciaReportes,
  getEstadoVehiculos,
  obtenerRangoFechas,
} from "../../services/estadisticasService";

import GraficaOcupacionVehiculos from "../../components/estadisticas/GraficaOcupacionVehiculos";
import GraficaConductoresActivos from "../../components/estadisticas/GraficaConductoresActivos";
import GraficaRutasEstado from "../../components/estadisticas/GraficaRutasEstado";
import GraficaReportesTipo from "../../components/estadisticas/GraficaReportesTipo";
import GraficaDistribucionTurnos from "../../components/estadisticas/GraficaDistribucionTurnos";
import GraficaOcupacionRutas from "../../components/estadisticas/GraficaOcupacionRutas";
import GraficaTendenciaReportes from "../../components/estadisticas/GraficaTendenciaReportes";
import GraficaEstadoVehiculos from "../../components/estadisticas/GraficaEstadoVehiculos";
import PeriodoSelector from "../../components/estadisticas/PeriodoSelector";

const T = theme.lightMode;

export default function EstadisticasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const returnTo = params.returnTo;
  const vieneDelPerfil = returnTo === "perfil";
  const insets = useSafeAreaInsets();
  const [periodo, setPeriodo] = useState("mes");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [ocupacionVehiculos, setOcupacionVehiculos] = useState([]);
  const [conductoresActivos, setConductoresActivos] = useState(0);
  const [conductoresActivosTend, setConductoresActivosTend] = useState([]);
  const [rutasEstado, setRutasEstado] = useState([]);
  const [reportesTipo, setReportesTipo] = useState([]);
  const [distribucionTurnos, setDistribucionTurnos] = useState([]);
  const [ocupacionRutas, setOcupacionRutas] = useState([]);
  const [tendenciaReportes, setTendenciaReportes] = useState([]);
  const [estadoVehiculos, setEstadoVehiculos] = useState({
    resumen: [],
    detalles: [],
  });

  // Función para navegar hacia atrás (cuando viene del perfil)
  const handleBack = () => {
    if (vieneDelPerfil) {
      router.replace("/home?tab=perfil");
    } else {
      router.back();
    }
  };

  // Función para ir al perfil (cuando se presiona el engranaje)
  const handleGoToProfile = () => {
    router.push("/home?tab=perfil");
  };

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
        reportes,
        distribucion,
        ocupRutas,
        tendencia,
        estado,
      ] = await Promise.all([
        getOcupacionVehiculos(inicio, fin),
        getConductoresActivos(inicio, fin),
        getConductoresActivosTendencia(inicio, fin),
        getRutasCompletadosCancelados(inicio, fin),
        getReportesPorTipo(inicio, fin),
        getDistribucionTurnos(inicio, fin),
        getOcupacionRutas(inicio, fin),
        getTendenciaReportes(inicio, fin),
        getEstadoVehiculos(inicio, fin),
      ]);

      setOcupacionVehiculos(ocupacion);
      setConductoresActivos(conductores);
      setConductoresActivosTend(conductoresTend);
      setRutasEstado(rutas);
      setReportesTipo(reportes);
      setDistribucionTurnos(distribucion);
      setOcupacionRutas(ocupRutas);
      setTendenciaReportes(tendencia);
      setEstadoVehiculos(estado);
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
    <View style={styles.root}>
      <Header
        titulo="Estadísticas"
        subtitulo="Reportes y análisis del sistema"
        showBack={vieneDelPerfil}
        onBack={handleBack}
        iconoDerecha={!vieneDelPerfil ? (
          <TouchableOpacity onPress={handleGoToProfile}>
            <Ionicons name="settings-outline" size={36} color="#fff" />
          </TouchableOpacity>
        ) : null}
      />

      <ScrollView
        style={[
          styles.container,
          { backgroundColor: T.background },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContent}>
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
        <GraficaReportesTipo datos={reportesTipo} cargando={cargando} />
        <GraficaDistribucionTurnos
          datos={distribucionTurnos}
          cargando={cargando}
        />
        <GraficaOcupacionRutas datos={ocupacionRutas} cargando={cargando} />
        <GraficaTendenciaReportes datos={tendenciaReportes} cargando={cargando} />
        <GraficaEstadoVehiculos datos={estadoVehiculos} cargando={cargando} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.background,
  },
  container: {
    flex: 1,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
});