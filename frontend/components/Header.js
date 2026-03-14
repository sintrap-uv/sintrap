import { View, Text, StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Rect } from "react-native-svg";
import theme from "../constants/theme";

const Header = ({titulo,subtitulo, mode = "light", iconoDerecha = null })=>{
 const colors = mode ==="dark" ? theme.darkMode : theme.lightMode;
 const h = colors.Headers;

 return(
    <View style = {styles.container}>
    <Svg height="160" width="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient
        id="radial"
        cx = {h.cx}
        cy = {h.cy}
        rx = {h.rx}
        ry = {h.ry}
        >
        <Stop offset = "0%" stopColor ={h.innerColor} />
        <Stop offset = "100%" stopColor ={h.outerColor} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="160" fill="url(#radial)"/>
    </Svg>

     <View style={styles.content}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
        <Text style={styles.title}>{titulo}</Text>
        {iconoDerecha}
        </View>
        <Text style={styles.subtitulo}>{subtitulo}</Text>
      </View>

    </View>
 );
};

const styles = StyleSheet.create({
  container:{
    width:"100%",
    height: 160,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden"
  },

  content: {
    flex:1,
    paddingTop: 70,
    paddingBottom: 24,
    paddingHorizontal: 35,
  },  
  title: {
    color: "#FFFFFF",
    fontSize: theme.lightMode ? 22 : 22,
    fontFamily: "DMSans_700Bold",
  },
  subtitulo:{
    color: "#E8FCEB",
    fontSize: theme.lightMode ? 16 :16,
    marginTop: 10,
    fontFamily: "DMSans_700Bold"
  }

 
});

export default Header ;