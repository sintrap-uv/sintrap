import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import theme from "../constants/theme";

const Header = ({
  titulo,
  subtitulo,
  mode = "light",
  iconoDerecha = null,
  showBack = false,
  onBack = null
}) => {
  const colors = mode === "dark" ? theme.darkMode : theme.lightMode;
  const h = colors.Headers;

  return (
    <View style={styles.container}>
      <Svg height="160" width="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="radial" cx={h.cx} cy={h.cy} rx={h.rx} ry={h.ry}>
            <Stop offset="0%" stopColor={h.innerColor} />
            <Stop offset="100%" stopColor={h.outerColor} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="160" fill="url(#radial)" />
      </Svg>

      <View style={styles.content}>
        {/* Fila principal: flecha + (título + subtítulo) + icono derecho */}
        <View style={styles.headerRow}>
          {showBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={25} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{titulo}</Text>
            {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
          </View>
          
          {iconoDerecha && <View style={styles.rightIcon}>{iconoDerecha}</View>}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: 160,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 20, // Reducido de 35 para mejor espacio
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
  },
  subtitulo: {
    color: "#E8FCEB",
    fontSize: 16,
    marginTop: 6,
    fontFamily: "DMSans_700Bold",
  },
  rightIcon: {
    marginLeft: 12,
    marginTop: -20,
  },
});

export default Header;