 import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const NAV_CONFIGS = {
  // Rol: Usuario normal
  usuario: [
    { key: 'inicio',    label: 'Inicio',    icon: 'home'          },
    { key: 'favoritos', label: 'Favoritos', icon: 'heart',        },
    { key: 'rutas',     label: 'Rutas',     icon: 'location'      },
    { key: 'perfil',    label: 'Perfil',    icon: 'person'        },
  ],
  // Rol: Conductor
  conductor: [
    { key: 'inicio',    label: 'Inicio',    icon: 'home'          },
    { key: 'rutas',     label: 'Rutas',     icon: 'navigate'      },
    { key: 'agregar',   label: 'Reportar',  icon: 'add-circle'    },
    { key: 'bus',       label: 'Mi Bus',    icon: 'bus'           },
    //{ key: 'stats',     label: 'Stats',     icon: 'bar-chart'     },
  ],
  // Rol: Administrador
  administrador: [
    { key: 'inicio',    label: 'Inicio',    icon: 'home'                },
    { key: 'rutas',     label: 'Rutas',     icon: 'map'                 },
    { key: 'crear',     label: 'Crear',  icon: 'add'               },
    { key: 'buses',       label: 'Buses',    icon: 'bus'                },
    { key: 'graficas',     label: 'Graficas',icon: 'bar-chart'  },
     
  ],
};

export function BottomNavBar({ rol = 'usuario', initialTab, onTabPress }) {
  const tabs = NAV_CONFIGS[rol];
  const [activeTab, setActiveTab] = useState(initialTab ?? tabs[0].key);

  const handlePress = (key) => {
    setActiveTab(key);
    onTabPress?.(key);
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => handlePress(tab.key)}
          >
            {isActive && <View style={styles.activeBar} />}
            <Ionicons
              name={isActive ? tab.icon : `${tab.icon}-outline`}
              size={24}
              color={isActive ? '#2D6A2D' : '#9E9E9E'}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 12,
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
