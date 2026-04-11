import WebView from "react-native-webview"
import { View } from "react-native"


const MapaSimple = ({onSeleccionado}) =>{

const mapa =`

<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
     <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
     <style>
     html, body, #map {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
} 
     </style>
</head>
<body>
    <div id = "map"> </div>
   
</body>
 <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
 <script>
    var map = L.map('map').setView([4.0847, -76.1955], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);

    var marcador = L.marker([4.0847, -76.1955]).addTo(map);

    map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lon = e.latlng.lng;
        marcador.setLatLng([lat, lon]);
        window.ReactNativeWebView.postMessage(JSON.stringify({
            tipo: 'ubicacionSeleccionada',
            lat: lat,
            lon: lon
        }));
    });
 </script>
</html>

`;

return(
    <View style={{flex:1}}>
        <WebView
          style={{ flex: 1 }}
         source={{html : mapa}}
         onMessage={(event)=>{
            const data = JSON.parse(event.nativeEvent.data);
            if(data.tipo == 'ubicacionSeleccionada'){
                onSeleccionado({
                    lat : data.lat,
                    lon : data.lon
                });
            }
         }}
         />
    </View>
)

}


export default MapaSimple;