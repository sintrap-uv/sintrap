import React from 'react';
import { View, StyleSheet, Text, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import theme from '../../constants/theme';

const { width } = Dimensions.get('window');
const T = theme.lightMode;

export default function GraficaOcupacionRutas({ datos, cargando }) {
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

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Ocupación de Rutas
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.filaTabla, styles.headerTabla]}>
            <Text style={[styles.celda, { fontWeight: 'bold', minWidth: 100 }]}>
              Ruta
            </Text>
            <Text style={[styles.celda, { fontWeight: 'bold', minWidth: 70, textAlign: 'center' }]}>
              Capacidad
            </Text>
            <Text style={[styles.celda, { fontWeight: 'bold', minWidth: 70, textAlign: 'center' }]}>
              Usuarios
            </Text>
            <Text style={[styles.celda, { fontWeight: 'bold', minWidth: 60, textAlign: 'right' }]}>
              %
            </Text>
          </View>

          {datos.map((ruta, idx) => (
            <View key={idx} style={styles.filaTabla}>
              <View style={{ minWidth: 100 }}>
                <Text style={[styles.celda, { fontWeight: '600' }]}>
                  Ruta {ruta.numero_ruta}
                </Text>
                <Text style={[styles.celda, { fontSize: 10, color: T.text.tertiary }]}>
                  {ruta.nombre}
                </Text>
              </View>

              <Text style={[styles.celda, { minWidth: 70, textAlign: 'center' }]}>
                {ruta.capacidad_total}
              </Text>

              <Text style={[styles.celda, { minWidth: 70, textAlign: 'center' }]}>
                {ruta.usuarios_asignados}
              </Text>

              <View style={{ minWidth: 60 }}>
                <View style={styles.barraProgreso}>
                  <View
                    style={[
                      styles.barraLlenada,
                      {
                        width: `${ruta.porcentaje}%`,
                        backgroundColor:
                          ruta.porcentaje <= 50
                            ? '#10b981'
                            : ruta.porcentaje <= 80
                            ? '#f59e0b'
                            : '#ef4444',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.celda, { textAlign: 'right', marginTop: 2 }]}>
                  {ruta.porcentaje}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
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
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  headerTabla: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderBottomWidth: 2,
    borderBottomColor: '#22C55E',
  },
  celda: {
    fontSize: 12,
    color: '#475569',
  },
  barraProgreso: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraLlenada: {
    height: '100%',
  },
});
