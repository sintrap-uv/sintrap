import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import MapView, { Circle } from 'react-native-maps';
import { useState, useEffect } from "react";
import { ubicacionColaboradores } from "../../../services/colaboradores";
import { agruparPorCercania } from "../../../services/zonas";
import theme from "../../../constants/theme";


const MapaColaboradores = () => {

    const [colaboradores, setColaboradores] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [cargando, setCargando] = useState(true);

    const cargarDatos = async () => {

        setCargando(true);
        const datos = await ubicacionColaboradores();

        setColaboradores(datos);
        const valores = agruparPorCercania(datos, 0.3);
        setGrupos(valores)

        setCargando(false);
    }

    useEffect(() => {
        cargarDatos();
    }, []);

    return (
        <View>

            {cargando ? (
                <View style={styles.contenedor}>
                    <ActivityIndicator size={"large"} />
                    <Text>{'Cargando colaboradores'}</Text>
                </View>

            ) : (

                <View>
                    <Text>{'Grupos encontrados ' + grupos.length}</Text>
                    <MapView
                        style={styles.mapa}
                        initialRegion={
                            grupos.length > 0 ? { latitude: grupos[0].centro.lat, longitude: grupos[0].centro.lon, latitudeDelta: 0.05, longitudeDelta: 0.05 }
                                : { latitude: 4.0863, longitude: -76.195, latitudeDelta: 0.05, longitudeDelta: 0.05 }
                        }
                    >

                        {grupos.map(grupo => (
                            <Circle
                                fillColor="rgba(76, 175, 80, 0.3)"
                                strokeColor="#4CAF50" radius={300}
                                center={{ latitude: grupo.centro.lat, longitude: grupo.centro.lon }}
                                key={grupo.id} />
                        ))}
                    </MapView>
                </View>

            )}
        </View>

    )
}
const T = theme.lightMode;
const styles = StyleSheet.create({

    contenedor: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    mapa: {
        flex: 1,
    }

})

export default MapaColaboradores;