import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../services/supabase";
import { getDashboardConductor } from "../../services/dashboardConductorService";
import Header from "../../components/Header";
import theme from "../../constants/theme";

const T = theme.lightMode;

// Parser WKT → [[lat, lon], ...]
const parsearTrayecto = (wkt) => {
  if (!wkt) return [];
  try {
    const match = wkt.match(/LINESTRING\s*\(([^)]+)\)/i);
    if (!match) return [];
    return match[1].split(",").map((par) => {
      const [lon, lat] = par.trim().split(/\s+/).map(Number);
      return [lat, lon];
    });
  } catch (_) {
    return [];
  }
};

// ### HTML del mapa — usa OSRM para trazar sobre calles reales #### 
const generarHtmlMapaRuta = ({ puntos, paradas, centroInicial }) => {

  // Marcadores rojos numerados para las paradas
  const paradaMarkersJS = paradas
    .filter((p) => p.latitud && p.longitud)
    .map((p, i) => `
      L.marker([${p.latitud}, ${p.longitud}], {
        icon: L.divIcon({
          className: '',
          html: '<div style="background:#EF4444;border:2px solid white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 1px 4px rgba(0,0,0,0.4);font-size:10px;font-weight:bold;color:white">${i + 1}</div>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        })
      }).addTo(map).bindPopup(${JSON.stringify(p.nombre || `Parada ${i + 1}`)});
    `)
    .join("\n");

  // Puntos del trayecto como array JS

  const puntosJS = JSON.stringify(puntos); 

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: true }).setView([${centroInicial}], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  // Paradas
  ${paradaMarkersJS}

  // Puntos del trayecto guardados en la BD
  var puntosTrayecto = ${puntosJS};

  // Trazar la ruta por calles reales usando OSRM
  // Construye la URL con todos los puntos en secuencia
  function trazarRutaOSRM(puntos) {
    if (!puntos || puntos.length < 2) return;

    // OSRM espera coordenadas como lon,lat separadas por ;
    var coords = puntos.map(function(p) {
      return p[1] + ',' + p[0]; // lon,lat
    }).join(';');

    var url = 'https://router.project-osrm.org/route/v1/driving/' + coords + '?geometries=geojson&overview=full';

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.routes && data.routes.length > 0) {
          var coordenadasRuta = data.routes[0].geometry.coordinates.map(function(p) {
            return [p[1], p[0]]; // GeoJSON viene como [lon, lat], Leaflet necesita [lat, lon]
          });

          var polyline = L.polyline(coordenadasRuta, {
            color: '#080aa1',
            weight: 5,
            opacity: 0.85
          }).addTo(map);

          // Ajustar la vista para mostrar toda la ruta
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } else {
          // Fallback: trazar línea directa si OSRM no responde
          var polyline = L.polyline(puntos, {
            color: '#080aa1',
            weight: 5,
            opacity: 0.85,
            dashArray: '8,4'
          }).addTo(map);
          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        }
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ tipo: 'listo' })
        );
      })
      .catch(function(err) {
        // Fallback sin conexión: línea directa entre puntos
        var polyline = L.polyline(puntos, {
          color: '#080aa1',
          weight: 5,
          opacity: 0.7,
          dashArray: '8,4'
        }).addTo(map);
        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ tipo: 'listo' })
        );
      });
  }

  trazarRutaOSRM(puntosTrayecto);
<\/script>
</body>
</html>`;
};

// ##### Componente principal #####

export default function MapaRutaConductor() {
  const router     = useRef(null);
  const routerNav  = useRouter();
  const webViewRef = useRef(null);

  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState(null);
  const [htmlMapa,  setHtmlMapa]  = useState(null);
  const [infoRuta,  setInfoRuta]  = useState(null);

  useEffect(() => {
    const cargar = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const conductorId = authData?.user?.id;
        if (!conductorId) throw new Error("No autenticado");

        const resultado = await getDashboardConductor(conductorId);

        if (!resultado.success || !resultado.data) {
          throw new Error("No tienes una ruta asignada para hoy.");
        }

        const { ruta, paradas } = resultado.data;

        // Parsear WKT → [[lat, lon], ...]
        const puntos = parsearTrayecto(ruta?.trayecto);

        // Centro: primer punto del trayecto → primera parada → empresa
        const centro =
          puntos.length > 0
            ? `${puntos[0][0]}, ${puntos[0][1]}`
            : paradas?.length > 0 && paradas[0].latitud
            ? `${paradas[0].latitud}, ${paradas[0].longitud}`
            : "4.0863, -76.195";

        setInfoRuta({
          nombre:     ruta?.nombre     ?? "Mi ruta",
          numeroRuta: ruta?.numeroRuta ?? "",
        });

        setHtmlMapa(
          generarHtmlMapaRuta({
            puntos,
            paradas: paradas ?? [],
            centroInicial: centro,
          })
        );
      } catch (e) {
        setError(e.message);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const handleMensaje = (event) => {
    try {
      JSON.parse(event.nativeEvent.data);
    } catch (_) {}
  };

  // Cargando
  if (cargando) {
    return (
      <View style={s.root}>
        <Header
          titulo="Mi ruta"
          subtitulo="Cargando..."
          mode="light"
          showBack
          onBack={() => routerNav.back()}
        />
        <View style={s.centrado}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={s.textoSecundario}>Cargando tu ruta asignada...</Text>
        </View>
      </View>
    );
  }

  //  Error / sin ruta 
  if (error) {
    return (
      <View style={s.root}>
        <Header
          titulo="Mi ruta"
          subtitulo="Sin ruta"
          mode="light"
          showBack
          onBack={() => routerNav.back()}
        />
        <View style={s.centrado}>
          <Ionicons name="map-outline" size={56} color="#D1D5DB" />
          <Text style={s.errorTitulo}>Sin ruta disponible</Text>
          <Text style={s.textoSecundario}>{error}</Text>
        </View>
      </View>
    );
  }

  // Mapa
  return (
    <View style={s.root}>
      <Header
        titulo={infoRuta?.nombre ?? "Mi ruta"}
        subtitulo={
          infoRuta?.numeroRuta ? `Ruta ${infoRuta.numeroRuta}` : "Ruta asignada"
        }
        mode="light"
        showBack
        onBack={() => routerNav.back()}
      />

      <WebView
        ref={webViewRef}
        style={s.mapa}
        source={{ html: htmlMapa }}
        onMessage={handleMensaje}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={["*"]}
        mixedContentMode="always"
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: T.background },
  mapa:  { flex: 1 },
  centrado: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  errorTitulo: {
    fontSize: 18,
    fontWeight: "600",
    color: T.text.primary,
    textAlign: "center",
  },
  textoSecundario: {
    fontSize: 14,
    color: T.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  btnVolver: {
    marginTop: 16,
    backgroundColor: T.Button.primary.background,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnVolverTexto: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});