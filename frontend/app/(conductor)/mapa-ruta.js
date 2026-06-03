// app/(conductor)/mapa-ruta.js
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

// ─── Parser WKT → [[lat, lon], ...] ─────────────────────────────────────────
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

// ─── HTML del mapa ────────────────────────────────────────────────────────────
const generarHtmlMapaRuta = ({ puntos, paradas, centroInicial }) => {

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

  const puntosJS  = JSON.stringify(puntos);
  const paradasJS = JSON.stringify(
    paradas
      .filter((p) => p.latitud && p.longitud)
      .map((p) => [p.latitud, p.longitud])
  );

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

  // Marcadores de paradas
  ${paradaMarkersJS}

  var puntosTrayecto = ${puntosJS};
  var coordsParadas  = ${paradasJS};

  /**
   * Construye la lista de waypoints para OSRM combinando:
   * - Primer y último punto del trayecto (origen y destino)
   * - Todas las paradas (waypoints intermedios obligatorios)
   * Ordenados por proximidad al origen para que el recorrido sea coherente.
   */
  function construirWaypoints(puntos, paradas) {
    if (!puntos || puntos.length === 0) return paradas;

    var origen  = puntos[0];
    var destino = puntos[puntos.length - 1];

    // Calcular distancia euclidiana simple (suficiente para ordenar)
    function dist(a, b) {
      var dlat = a[0] - b[0];
      var dlon = a[1] - b[1];
      return Math.sqrt(dlat * dlat + dlon * dlon);
    }

    // Ordenar paradas por distancia al origen
    var paradasOrdenadas = paradas.slice().sort(function(a, b) {
      return dist(a, origen) - dist(b, origen);
    });

    // Construir: origen → paradas ordenadas → destino
    // Evitar duplicar si origen/destino ya coinciden con alguna parada
    var waypoints = [origen];
    paradasOrdenadas.forEach(function(p) {
      // Solo agregar si no es casi igual al origen o destino
      if (dist(p, origen) > 0.0001 && dist(p, destino) > 0.0001) {
        waypoints.push(p);
      }
    });
    waypoints.push(destino);

    return waypoints;
  }

  function trazarRutaOSRM(puntos, paradas) {
    var waypoints = construirWaypoints(puntos, paradas);

    if (waypoints.length < 2) {
      // Fallback: dibujar línea directa con los puntos disponibles
      var fallback = puntos.length > 0 ? puntos : paradas;
      if (fallback.length > 0) {
        var poly = L.polyline(fallback, { color: '#22C55E', weight: 5, opacity: 0.7, dashArray: '8,4' }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });
      }
      return;
    }

    // OSRM espera lon,lat separados por ;
    var coords = waypoints.map(function(p) {
      return p[1] + ',' + p[0];
    }).join(';');

    var url = 'https://router.project-osrm.org/route/v1/driving/'
      + coords
      + '?geometries=geojson&overview=full';

    fetch(url)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.routes && data.routes.length > 0) {
          var coordenadasRuta = data.routes[0].geometry.coordinates.map(function(p) {
            return [p[1], p[0]]; // GeoJSON [lon,lat] → Leaflet [lat,lon]
          });

          var polyline = L.polyline(coordenadasRuta, {
            color:   '#22C55E',
            weight:  5,
            opacity: 0.85
          }).addTo(map);

          map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
        } else {
          // OSRM respondió pero sin rutas — fallback línea directa
          var poly = L.polyline(waypoints, {
            color: '#22C55E', weight: 5, opacity: 0.85, dashArray: '8,4'
          }).addTo(map);
          map.fitBounds(poly.getBounds(), { padding: [40, 40] });
        }
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ tipo: 'listo' })
        );
      })
      .catch(function() {
        // Sin conexión — fallback línea directa
        var poly = L.polyline(waypoints, {
          color: '#22C55E', weight: 5, opacity: 0.7, dashArray: '8,4'
        }).addTo(map);
        map.fitBounds(poly.getBounds(), { padding: [40, 40] });
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ tipo: 'listo' })
        );
      });
  }

  trazarRutaOSRM(puntosTrayecto, coordsParadas);
<\/script>
</body>
</html>`;
};

// ─── Componente principal ─────────────────────────────────────────────────────
export default function MapaRutaConductor() {
  const routerNav  = useRouter();
  const webViewRef = useRef(null);

  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);
  const [htmlMapa, setHtmlMapa] = useState(null);
  const [infoRuta, setInfoRuta] = useState(null);

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

        const puntos = parsearTrayecto(ruta?.trayecto);

        // Centro: primera parada → primer punto trayecto → empresa
        const centro =
          paradas?.length > 0 && paradas[0].latitud
            ? `${paradas[0].latitud}, ${paradas[0].longitud}`
            : puntos.length > 0
            ? `${puntos[0][0]}, ${puntos[0][1]}`
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
    try { JSON.parse(event.nativeEvent.data); } catch (_) {}
  };

  if (cargando) {
    return (
      <View style={s.root}>
        <Header titulo="Mi ruta" subtitulo="Cargando..." mode="light" showBack onBack={() => routerNav.back()} />
        <View style={s.centrado}>
          <ActivityIndicator size="large" color={T.Button.primary.background} />
          <Text style={s.textoSecundario}>Cargando tu ruta asignada...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.root}>
        <Header titulo="Mi ruta" subtitulo="Sin ruta" mode="light" showBack onBack={() => routerNav.back()} />
        <View style={s.centrado}>
          <Ionicons name="map-outline" size={56} color="#D1D5DB" />
          <Text style={s.errorTitulo}>Sin ruta disponible</Text>
          <Text style={s.textoSecundario}>{error}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Header
        titulo={infoRuta?.nombre ?? "Mi ruta"}
        subtitulo={infoRuta?.numeroRuta ? `Ruta ${infoRuta.numeroRuta}` : "Ruta asignada"}
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
  root:    { flex: 1, backgroundColor: T.background },
  mapa:    { flex: 1 },
  centrado: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32,
  },
  errorTitulo: {
    fontSize: 18, fontWeight: "600", color: T.text.primary, textAlign: "center",
  },
  textoSecundario: {
    fontSize: 14, color: T.text.secondary, textAlign: "center", lineHeight: 20,
  },
});