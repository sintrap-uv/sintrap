import React from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import theme from '../../constants/theme';

const { width } = Dimensions.get('window');
const T = theme.lightMode;

export default function GraficaRutasEstado({ datos, cargando }) {
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
        <Text style={{ color: T.text.tertiary }}>No hay datos</Text>
      </View>
    );
  }

  const colorMap = {
    completado: '#10b981',
    cancelado: '#ef4444',
    en_curso: '#f59e0b',
    programado: '#3b82f6',
  };

  const chartData = datos.map(item => ({
    name: item.estado.charAt(0).toUpperCase() + item.estado.slice(1),
    cantidad: item.cantidad,
    color: colorMap[item.estado] || '#94a3b8',
    legendFontColor: T.text.secondary,
    legendFontSize: 12,
  }));

  const total = datos.reduce((sum, item) => sum + item.cantidad, 0) || 1;
  const completados = datos.find(d => d.estado === 'completado')?.cantidad || 0;
  const tasaExito = Math.round((completados / total) * 100);

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Rutas: Completadas vs Canceladas
      </Text>

      <PieChart
        data={chartData}
        width={width - 40}
        height={220}
        chartConfig={{
          backgroundColor: T.cards.background,
          backgroundGradientFrom: T.cards.background,
          backgroundGradientTo: T.cards.background,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
          useShadowColorFromDataset: false,
        }}
        accessor="cantidad"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute={true}
      />

      <View style={styles.estadisticas}>
        <View style={styles.stat}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Total</Text>
          <Text style={[styles.numero, { color: T.text.primary }]}>{total}</Text>
        </View>
        <View style={styles.stat}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Tasa Éxito</Text>
          <Text style={[styles.numero, { color: '#10b981' }]}>{tasaExito}%</Text>
        </View>
        <View style={styles.stat}>
          <Text style={{ color: T.text.secondary, fontSize: 12 }}>Completadas</Text>
          <Text style={[styles.numero, { color: '#10b981' }]}>{completados}</Text>
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
