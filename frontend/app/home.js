  import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BottomNavBar } from '../components/BottomNavBar';
import Header from '../components/Header';





const ROL_ACTUAL = 'usuario';

export default function Home() {
  return (
    
    <View>
      <Header titulo="Hola " mode="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { backgroundColor: '#1B5E20', paddingTop: Platform.OS === 'ios' ? 56 : 48, paddingBottom: 20, paddingHorizontal: 20 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 14, color: '#A5D6A7', marginTop: 4 },
  gradient: { flex: 1, paddingTop: 40, alignItems: 'center' },
  alertBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#fff', borderRadius: 24, paddingVertical: 10, paddingHorizontal: 20 },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '500' },
});