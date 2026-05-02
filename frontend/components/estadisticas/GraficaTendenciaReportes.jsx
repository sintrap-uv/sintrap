import React from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import theme from '../../constants/theme';

const { width } = Dimensions.get('window');
const T = theme.lightMode;

export default function GraficaTendenciaReportes({ datos, cargando }) {
  if (cargando) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <ActivityIndicator size="small" color={T.icon.active} />
      </View>
    );
  }

  if (!datos || datos.length < 2) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <Text style={{ color: T.text.tertiary }}>
          Necesita al menos 2 días de datos
        </Text>
      </View>
    );
  }

  const porDia = {};
  datos.forEach(item => {
    if (!porDia[item.dia]) {
      porDia[item.dia] = 0;
    }
    porDia[item.dia] += item.cantidad;
  });

  const diasOrdenados = Object.keys(porDia).sort();
  const ultimosDias = diasOrdenados.slice(-10);

  const chartData = {
    labels: ultimosDias.map(dia => {
      const fecha = new Date(dia);
      return `${fecha.getDate()}/${fecha.getMonth() + 1}`;
    }),
    datasets: [
      {
        data: ultimosDias.map(dia => porDia[dia]),
        color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
        strokeWidth: 2,
        fillShadow: true,
      },
    ],
  };

  const promedio = Math.round(
    ultimosDias.reduce((sum, dia) => sum + porDia[dia], 0) / ultimosDias.length
  );
  const maximo = Math.max(...ultimosDias.map(d => porDia[d]));

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Tendencia de Reportes
      </Text>

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
          color: () => '#f59e0b',
          strokeWidth: 2,
          useShadowColorFromDataset: true,
          labelColor: (opacity = 1) => T.text.tertiary,
        }}
        withDots={true}
        withInnerLines={true}
        withOuterLines={true}
      />

      <View style={styles.estadisticas}>
        <View style={styles.stat}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Promedio</Text>
          <Text style={[styles.numero, { color: T.icon.alert }]}>{promedio}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Máximo</Text>
          <Text style={[styles.numero, { color: '#ef4444' }]}>{maximo}</Text>
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
  estadisticas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  stat: {
    alignItems: 'center',
  },
  numero: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
});
