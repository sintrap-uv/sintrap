import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ACCIONES = [
  { key: 'bus', label: 'Crear bus', icon: 'bus-outline' },
  { key: 'ruta', label: 'Crear Ruta', icon: 'location-outline' },
  { key: 'conductor', label: 'Crear conductor', icon: 'person-outline' },
];

export default function BotonesFlotantes({ onAccion }) {
  return (
    <View style={styles.contenedorExterno}>
      {ACCIONES.map((accion) => (
        <TouchableOpacity
          key={accion.key}
          style={styles.botonOpcion}
          onPress={() => onAccion(accion.key)}
        >
          <Text style={styles.textoLabel}>{accion.label}</Text>
          <View style={styles.circuloIcono}>
            <Ionicons name={accion.icon} size={20} color="#2D6A2D" />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedorExterno: {
    position: 'absolute',
    bottom: 110, // Ajusta esto para que quede justo arriba del botón verde
    alignSelf: 'center',
    alignItems: 'flex-end', // Alinea los botones a la derecha si quieres, o al centro
    gap: 12, // Espacio entre cada botón
    zIndex: 999,
  },
  botonOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    // Sombras para que se vea como en la foto
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  textoLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
    fontWeight: '500',
  },
  circuloIcono: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});