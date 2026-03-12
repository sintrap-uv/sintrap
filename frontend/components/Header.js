import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import theme from "../constants/theme";


const Header = ({titulo, mode = "light"})=>{
 const colors = mode ==="dark" ? theme.darkMode : theme.lightMode;

 return(
    <View>
     <LinearGradient
        colors = {colors.Headers.gradientColors}
        style = {styles.header}
        >
            <Text style={styles.title} >{titulo}</Text>
     </LinearGradient>
    </View>
 );
};

const styles = StyleSheet.create({

  header: {
    width: "100%",
    height: 160,
    paddingTop: 80,
    paddingBottom: 24,
    paddingHorizontal: 35,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    color: "#FFFFFF",
    fontSize: theme.lightMode ? 22 : 22,
    fontFamily: "DMSans_700Bold",
  },

 
});
 export default Header;