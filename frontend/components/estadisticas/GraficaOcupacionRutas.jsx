import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator, ScrollView } from 'react-native';
import theme from '../../constants/theme';
import { getOcupacionRutas } from '../../services/estadisticasService';

const T = theme.lightMode;

export default function GraficaOcupacionRutas() {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    const resultado = await getOcupacionRutas();
    if (resultado.success) {
      setDatos(resultado.data);
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

  if (!datos || datos.length === 0) {
    return (
      <View style={[styles.card, { backgroundColor: T.cards.background }]}>
        <Text style={{ color: T.text.tertiary }}>No hay rutas con vehículos asignados</Text>
      </View>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: T.cards.background }]}>
      <Text style={[styles.titulo, { color: T.text.primary }]}>
        Ocupación de Rutas
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View>
          <View style={[styles.filaTabla, styles.headerTabla]}>
            <Text style={[styles.celda, styles.headerText, { width: 140 }]}>Ruta</Text>
            <Text style={[styles.celda, styles.headerText, { width: 80, textAlign: 'center' }]}>Capac.</Text>
            <Text style={[styles.celda, styles.headerText, { width: 80, textAlign: 'center' }]}>Usuar.</Text>
            <Text style={[styles.celda, styles.headerText, { width: 70, textAlign: 'right' }]}>%</Text>
          </View>

          {datos.map((ruta, idx) => (
            <View key={idx} style={styles.filaTabla}>
              <View style={{ width: 140, paddingRight: 10 }}>
                <Text style={[styles.celda, { fontWeight: '600' }]} numberOfLines={1}>
                  Ruta {ruta.numero_ruta}
                </Text>
                <Text 
                  style={[styles.celda, { fontSize: 10, color: T.text.tertiary }]} 
                  numberOfLines={1} 
                  ellipsizeMode="tail"
                >
                  {ruta.nombre}
                </Text>
              </View>

              <Text style={[styles.celda, { width: 80, textAlign: 'center' }]}>
                {ruta.capacidad_total}
              </Text>

              <Text style={[styles.celda, { width: 80, textAlign: 'center' }]}>
                {ruta.usuarios_asignados}
              </Text>

              <View style={{ width: 70 }}>
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
                <Text style={[styles.celda, { textAlign: 'right', marginTop: 2, fontSize: 11 }]}>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  titulo: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  filaTabla: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  headerTabla: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderBottomWidth: 2,
    borderBottomColor: '#22C55E',
    borderRadius: 4,
  },
  headerText: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  celda: {
    fontSize: 12,
    color: '#475569',
  },
  barraProgreso: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barraLlenada: {
    height: '100%',
  },
});
