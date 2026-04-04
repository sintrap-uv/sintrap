import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
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

    const circulosJS = grupos.map(grupo =>
        `L.circle([${grupo.centro.lat}, ${grupo.centro.lon}],{radius : 300}).addTo(map);`
    ).join("\n");

    const marcadoresJS = colaboradores.map(colaborador => 
        `L.marker([${colaborador.ubicacion_usuario.latidud},${colaborador.ubicacion_usuario.longitud}]).addTo(map);
        ` ).join("\n");
    

    const htmlMapa = `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        #map { width: 100%; height: 100vh; }
    </style>
</head>
<body>
    <div id="map"></div>
    <script> var map = L.map('map').setView([4.0863,-76.195], 13)
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,}).addTo(map);
            ${circulosJS}  ${marcadoresJS}
    </script>
</body>
</html>
`;

    return (

        <View style={styles.mapaContenerdor}>
            {cargando ? (
                <View style={styles.contenedor}>
                    <ActivityIndicator size={"large"} />
                    <Text>{'Cargando colaboradores'}</Text>
                </View>

            ) : (

                <View style={styles.mapaContenerdor}>
                    <Text>{'Grupos encontrados ' + grupos.length}</Text>
                    <WebView source={{ html: htmlMapa }} />
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
    mapaContenerdor: {
        flex: 1,
    },
    mapa: {
        flex: 1,
    }

})

export default MapaColaboradores;