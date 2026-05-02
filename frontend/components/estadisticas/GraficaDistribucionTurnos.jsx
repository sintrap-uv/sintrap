import React from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import theme from '../../constants/theme';

const { width } = Dimensions.get('window');
const T = theme.lightMode;

export default function GraficaDistribucionTurnos({ datos, cargando }) {
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
    programado: '#3b82f6',
    en_curso: '#10b981',
    completado: '#9ca3af',
    cancelado: '#ef4444',
  };

  const chartData = datos.map(item => ({
    name: item.estado.charAt(0).toUpperCase() + item.estado.slice(1),
    cantidad: item.cantidad,
    color: item.color || colorMap[item.estado] || '#94a3b8',
    legendFontColor: T.text.secondary,
    legendFontSize: 11,
  }));

  const total = datos.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Distribución de Turnos
      </Text>

      <View style={styles.centerText}>
        <Text style={[styles.totalNumero, { color: T.text.primary }]}>
          {total}
        </Text>
        <Text style={{ color: T.text.secondary, fontSize: 12 }}>
          turnos totales
        </Text>
      </View>

      <PieChart
        data={chartData}
        width={width - 40}
        height={200}
        chartConfig={{
          backgroundColor: T.cards.background,
          backgroundGradientFrom: T.cards.background,
          backgroundGradientTo: T.cards.background,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          useShadowColorFromDataset: false,
        }}
        accessor="cantidad"
        backgroundColor="transparent"
        paddingLeft="15"
        absolute={true}
      />

      <View style={styles.leyenda}>
        {datos.map((item, idx) => (
          <View key={idx} style={styles.itemLeyenda}>
            <View
              style={[
                styles.colorBox,
                { backgroundColor: item.color || colorMap[item.estado] },
              ]}
            />
            <Text style={{ color: T.text.secondary, fontSize: 11, flex: 1 }}>
              {item.estado}: {item.cantidad}
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
    fontWeight: '600',
    marginBottom: 12,
  },
  centerText: {
    alignItems: 'center',
    marginVertical: 8,
  },
  totalNumero: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  itemLeyenda: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    width: '48%',
  },
  colorBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
    marginRight: 6,
  },
});

