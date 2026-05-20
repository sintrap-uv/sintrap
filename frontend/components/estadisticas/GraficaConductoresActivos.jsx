import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import theme from "../../constants/theme";
import { getTendenciaConductores } from "../../services/estadisticasService";

const { width } = Dimensions.get("window");
const T = theme.lightMode;

export default function GraficaConductoresActivos() {
  const [activos, setActivos] = useState(0);
  const [tendencia, setTendencia] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const resultado = await getTendenciaConductores();
    if (resultado.success) {
      setActivos(resultado.data.activos);
      setTendencia(resultado.data.tendencia);
    }
    setCargando(false);
  };

  if (cargando) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <ActivityIndicator size="small" color={T.icon.active} />
      </View>
    );
  }

  const chartData = {
    labels: tendencia.slice(-7).map((t) => {
      const fecha = new Date(t.dia);
      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: tendencia.slice(-7).map((t) => t.conductores_activos),
        color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  const promedio =
    tendencia.length > 0
      ? Math.round(
          tendencia.reduce((sum, t) => sum + t.conductores_activos, 0) /
            tendencia.length
        )
      : 0;

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Conductores Activos
      </Text>

      <View style={styles.kpiContainer}>
        <Text style={[styles.numeroGrande, { color: T.icon.active }]}>
          {activos}
        </Text>
        <Text style={{ color: T.text.secondary, fontSize: 14 }}>
          conductores en ruta hoy
        </Text>
      </View>

      {tendencia.length > 1 && (
        <LineChart
          data={chartData}
          width={width - 40}
          height={200}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: T.cards.background,
            backgroundGradientFrom: T.cards.background,
            backgroundGradientTo: T.cards.background,
            color: () => "#22C55E",
            strokeWidth: 2,
            useShadowColorFromDataset: false,
            labelColor: (opacity = 1) => T.text.tertiary,
          }}
          withDots={true}
          withInnerLines={true}
          withOuterLines={true}
        />
      )}

      <View style={styles.estadistica}>
        <Text style={{ color: T.text.secondary }}>Promedio del período:</Text>
        <Text style={[styles.numeroMediano, { color: T.icon.active }]}>
          {promedio}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  titulo: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  kpiContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  numeroGrande: {
    fontSize: 48,
    fontWeight: "bold",
  },
  numeroMediano: {
    fontSize: 24,
    fontWeight: "600",
    marginLeft: 8,
  },
  estadistica: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
});
