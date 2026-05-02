import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import theme from "../../constants/theme";

const { width } = Dimensions.get("window");
const T = theme.lightMode;

export default function GraficaOcupacionVehiculos({ datos, cargando }) {
  if (cargando) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <ActivityIndicator size="small" color={T.icon.active} />
      </View>
    );
  }

  if (!datos || datos.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <Text style={{ color: T.text.tertiary }}>No hay datos disponibles</Text>
      </View>
    );
  }

  const chartData = {
    labels: datos.slice(0, 8).map((v) => v.placa),
    datasets: [
      {
        data: datos.slice(0, 8).map((v) => v.porcentaje_ocupacion),
      },
    ],
  };

  const obtenerColor = (porcentaje) => {
    if (porcentaje <= 50) return "#10b981";
    if (porcentaje <= 80) return "#f59e0b";
    return "#ef4444";
  };

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Ocupación de Vehículos
      </Text>

      <BarChart
        data={chartData}
        width={width - 40}
        height={220}
        yAxisLabel="%"
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: T.cards.background,
          backgroundGradientFrom: T.cards.background,
          backgroundGradientTo: T.cards.background,
          color: () => "#10b981",
          strokeWidth: 2,
          barPercentage: 0.7,
          useShadowColorFromDataset: false,
          labelColor: (opacity = 1) => T.text.tertiary,
        }}
        withVerticalLabels={true}
        withHorizontalLabels={true}
        withOuterLines={true}
      />

      <View style={styles.tablaDetalles}>
        <View style={[styles.filaTabla, styles.headerTabla]}>
          <Text style={[styles.celdaTabla, { fontWeight: "bold", flex: 1 }]}>
            Vehículo
          </Text>
          <Text
            style={[
              styles.celdaTabla,
              { fontWeight: "bold", flex: 1, textAlign: "center" },
            ]}
          >
            Ocupación
          </Text>
          <Text
            style={[
              styles.celdaTabla,
              { fontWeight: "bold", flex: 0.6, textAlign: "right" },
            ]}
          >
            %
          </Text>
        </View>

        {datos.slice(0, 5).map((vehiculo, idx) => (
          <View key={idx} style={styles.filaTabla}>
            <Text style={[styles.celdaTabla, { flex: 1 }]}>
              {vehiculo.placa}
            </Text>
            <Text style={[styles.celdaTabla, { flex: 1, textAlign: "center" }]}>
              {vehiculo.ocupados}/{vehiculo.capacidad}
            </Text>
            <Text
              style={[
                styles.celdaTabla,
                {
                  flex: 0.6,
                  textAlign: "right",
                  color: obtenerColor(vehiculo.porcentaje_ocupacion),
                  fontWeight: "600",
                },
              ]}
            >
              {vehiculo.porcentaje_ocupacion}%
            </Text>
          </View>
        ))}
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
  tablaDetalles: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  filaTabla: {
    flexDirection: "row",
    paddingVertical: 8,
    alignItems: "center",
    borderBottomWidth: 0.5,
    borderBottomColor: "#f0f0f0",
  },
  headerTabla: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    borderBottomWidth: 2,
    borderBottomColor: "#10b981",
  },
  celdaTabla: {
    fontSize: 12,
    color: "#475569",
  },
});
