import React from "react";
import {
  View,
  StyleSheet,
  Text,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { BarChart } from "react-native-chart-kit";
import theme from "../../constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const T = theme.lightMode;

export default function GraficaEstadoVehiculos({ datos, cargando }) {
  if (cargando) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <ActivityIndicator size="small" color={T.icon.active} />
      </View>
    );
  }

  const { resumen = [], detalles = [] } = datos;

  if (resumen.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <Text style={{ color: T.text.tertiary }}>No hay vehículos</Text>
      </View>
    );

  }
  // Calcualar un ancho dinamico: 60 px para cada barra, minimo el ancho de la pantalla
  const chartWidth = Math.max(resumen.length * 60, SCREEN_WIDTH - 40);

  const chartData = {
    labels: resumen.map((r) => r.estado_vehiculo.substring(0, 10)),
    datasets: [
      {
        data: resumen.map((r) => r.cantidad),
      },
    ],
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: T.cards.background, marginBottom: 30 },
      ]}
    >
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Estado de Vehículos
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <BarChart
          data={chartData}
          width={chartWidth}
          height={220}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: T.cards.background,
            backgroundGradientFrom: T.cards.background,
            backgroundGradientTo: T.cards.background,
            color: () => "#8b5cf6",
            strokeWidth: 2,
            useShadowColorFromDataset: false,
            labelColor: (opacity = 1) => T.text.tertiary,
          }}
          withVerticalLabels={true}
          withHorizontalLabels={true}
        />
      </ScrollView>

      <View style={styles.tablaResumen}>
        {resumen.map((item, idx) => (
          <View
            key={idx}
            style={[
              styles.itemResumen,
              idx !== resumen.length - 1 && {
                borderBottomWidth: 0.5,
                borderBottomColor: "#e5e7eb",
              },
            ]}
          >
            <Text style={{ color: T.text.secondary, flex: 1 }}>
              {item.estado_vehiculo}
            </Text>
            <Text style={[styles.cantidadItem, { color: T.text.primary }]}>
              {item.cantidad}
            </Text>
          </View>
        ))}
      </View>

      {detalles.some((d) => d.estado === "Sin documentación") && (
        <View
          style={[
            styles.alerta,
            {
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderLeftColor: "#ef4444",
            },
          ]}
        >
          <Text style={{ color: "#ef4444", fontWeight: "600", fontSize: 12 }}>
            ⚠️ Hay{" "}
            {detalles.filter((d) => d.estado === "Sin documentación").length}{" "}
            vehículos con documentación vencida
          </Text>
        </View>
      )}
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
  tablaResumen: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  itemResumen: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  cantidadItem: {
    fontWeight: "600",
    fontSize: 16,
  },
  alerta: {
    marginTop: 12,
    padding: 10,
    borderLeftWidth: 4,
    borderRadius: 6,
  },
});
