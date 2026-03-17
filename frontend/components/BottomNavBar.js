import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import theme from '../constants/theme';

const NAV_CONFIGS = {
  // Rol: Usuario normal
  usuario: [
    { key: 'inicio', label: 'Inicio', icon: 'home' },
    { key: 'favoritos', label: 'Favoritos', icon: 'star', },
    { key: 'rutas', label: 'Rutas', icon: 'location' },
    { key: 'perfil', label: 'Perfil', icon: 'person' },
  ],
  // Rol: Conductor
  conductor: [
    { key: 'inicio', label: 'Inicio', icon: 'home' },
    { key: 'rutas', label: 'Rutas', icon: 'navigate' },
    { key: 'agregar', label: 'Reportar', icon: 'add-circle' },
    { key: 'bus', label: 'Mi Bus', icon: 'bus' },
    //{ key: 'stats',     label: 'Stats',     icon: 'bar-chart'     },
  ],
  // Rol: Administrador
  administrador: [
    { key: 'inicio', label: 'Inicio', icon: 'home' },
    { key: 'rutas', label: 'Rutas', icon: 'map' },
    { key: 'crear', label: 'Crear', icon: 'add' },
    { key: 'buses', label: 'Buses', icon: 'bus' },
    { key: 'graficas', label: 'Graficas', icon: 'bar-chart' },

  ],
};

export function BottomNavBar({ rol = 'usuario', initialTab, onTabPress }) {
  const tabs = NAV_CONFIGS[rol];
  const [activeTab, setActiveTab] = useState(initialTab ?? tabs[0].key);

  const isCrearActive = activeTab === 'crear';

  const handlePress = (key) => {
    if (key === 'crear' && activeTab === 'crear') {
      setActiveTab('inicio');
      onTabPress?.('inicio');
    } else {
      // Si no, funciona normal
      setActiveTab(key);
      onTabPress?.(key);
    }
  };

  return (
    <View style={[
      styles.container,
      isCrearActive && styles.containerFloating
    ]}>
      {tabs.map((tab) => {
        if (isCrearActive && tab.key !== 'crear') {
          return null;
        }
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab.key)}
          >
            {isActive && !isCrearActive && <View style={styles.activeBar} />}
            <Ionicons
              name={isCrearActive ? 'close' : (isActive ? tab.icon : `${tab.icon}-outline`)}
              size={isCrearActive ? 32 : 24}
              color={isCrearActive ? '#fff' : (isActive ? '#2D6A2D' : '#9E9E9E')}
            />
            {!isCrearActive && (
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {tab.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({

  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffffff',
    borderRadius: 24,
    width: 365,
    height: 70,
    marginHorizontal: 10,
    marginBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    gap: 28,
    // Sombra iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    // Sombra Android
    elevation: 8,
  },
  containerFloating: {
    backgroundColor: '#22C55E', // El verde vibrante de tu imagen
    width: 64,
    height: 64,
    borderRadius: 32, // Mitad del ancho/alto para círculo perfecto
    alignSelf: 'center', // Centra el círculo respecto a la pantalla

    // ESTO ES LO QUE CENTRA EL ICONO ADENTRO:
    justifyContent: 'center', // Centrado vertical
    alignItems: 'center',     // Centrado horizontal

    // Reseteamos paddings o gaps que puedan mover el icono
    paddingHorizontal: 0,
    paddingVertical: 0,
    gap: 0,

    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,

  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
    gap: 3,
  },
  activeBar: {
    position: 'absolute',
    top: -8,
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#4CAF50',
  },
  label: { fontSize: 10, color: '#9E9E9E' },
  labelActive: { color: '#2D6A2D', fontWeight: '700' },
});