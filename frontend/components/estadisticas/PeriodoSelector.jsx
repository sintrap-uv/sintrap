import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import theme from "../../constants/theme";

const T = theme.lightMode;

export default function PeriodoSelector({ periodo, onChangePeriodo }) {
  const periodos = [
    { id: "hoy", label: "Hoy" },
    { id: "semana", label: "Semana" },
    { id: "mes", label: "Mes" },
  ];

  return (
    <View style={styles.container}>
      {periodos.map((p) => (
        <TouchableOpacity
          key={p.id}
          onPress={() => onChangePeriodo(p.id)}
          style={[
            styles.boton,
            periodo === p.id
              ? [
                  styles.botonActivo,
                  { backgroundColor: T.Button.primary.background },
                ]
              : [styles.botonInactivo, { borderColor: T.cards.border }],
          ]}
        >
          <Text
            style={[
              styles.texto,
              periodo === p.id
                ? { color: T.Button.primary.Text, fontWeight: "600" }
                : { color: T.text.secondary },
            ]}
          >
            {p.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  boton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  botonActivo: {
    elevation: 2,
  },
  botonInactivo: {
    borderWidth: 1,
    backgroundColor: "#f8fafc",
  },
  texto: {
    fontSize: 13,
    fontWeight: "500",
  },
});
