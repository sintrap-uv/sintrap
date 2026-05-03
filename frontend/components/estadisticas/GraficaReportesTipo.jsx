import React from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import theme from '../../constants/theme';

const { width } = Dimensions.get('window');
const T = theme.lightMode;

export default function GraficaReportesTipo({ datos, cargando }) {
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
        <Text style={{ color: T.text.tertiary }}>No hay reportes</Text>
      </View>
    );
  }

  const chartData = {
    labels: datos.slice(0, 5).map(r => r.tipo.replace('_', '\n').substring(0, 8)),
    datasets: [
      {
        data: datos.slice(0, 5).map(r => r.cantidad),
      },
    ],
  };

  const total = datos.reduce((sum, r) => sum + r.cantidad, 0);
  const critico = datos[0];

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Reportes por Tipo
      </Text>

      <BarChart
        data={chartData}
        width={width - 40}
        height={220}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={{
          backgroundColor: T.cards.background,
          backgroundGradientFrom: T.cards.background,
          backgroundGradientTo: T.cards.background,
          color: () => '#f59e0b',
          strokeWidth: 2,
          useShadowColorFromDataset: false,
          labelColor: (opacity = 1) => T.text.tertiary,
        }}
        withVerticalLabels={true}
        withHorizontalLabels={true}
      />

      <View style={styles.resumen}>
        <View style={styles.item}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Total Reportes</Text>
          <Text style={[styles.numero, { color: T.icon.alert }]}>{total}</Text>
        </View>
        <View style={styles.item}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Más Común</Text>
          <Text style={[styles.numero, { color: T.text.primary }]}>
            {critico.tipo.replace('_', ' ')}
          </Text>
        </View>
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
    fontWeight: '600',
    marginBottom: 12,
  },
  resumen: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  item: {
    alignItems: 'center',
  },
  numero: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
});
