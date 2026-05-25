/**
 * Genera el HTML de Leaflet para visualizar la ruta asignada del usuario.
 * Incluye: trayecto, paradas, origen/destino, posición del bus y usuario.
 *
 * @param {Object} config - Objeto de configuración
 * @param {string} config.rutaTrayecto - Trayecto en formato WKB o array de coordenadas
 * @param {Array} config.paradas - Array de paradas con coordenadas
 * @param {Object} config.paradaOrigen - Parada de origen (objeto con latitud, longitud, nombre)
 * @param {Object} config.paradaDestino - Parada de destino
 * @param {Object} config.ubicacionUsuario - Posición del usuario {latitud, longitud}
 * @param {Object} config.ubicacionBus - Posición del bus {latitud, longitud, velocidad, updated_at}
 * @param {string} config.colorRuta - Color hexadecimal de la ruta (default: #3B82F6)
 * @returns {string} HTML completo para renderizar en WebView
 */
export const generarHtmlMapaRutaUsuario = ({
  rutaTrayecto,
  paradas = [],
  paradaOrigen,
  paradaDestino,
  ubicacionUsuario,
  ubicacionBus,
  colorRuta = '#3B82F6'
}) => {
  const trayectoJS = rutaTrayecto
    ? generarJSLineaRuta(rutaTrayecto, colorRuta)
    : '';

  const paradasJS = paradas
    .map(p => generarJSMarcadorParada(p))
    .join('\n');

  const origenJS = paradaOrigen
    ? generarJSMarcadorOrigen(paradaOrigen)
    : '';

  const destinoJS = paradaDestino
    ? generarJSMarcadorDestino(paradaDestino)
    : '';

  const busJS = ubicacionBus
    ? generarJSMarcadorBus(ubicacionBus)
    : '';

  const usuarioJS = ubicacionUsuario
    ? generarJSMarcadorUsuario(ubicacionUsuario)
    : '';

  // Centro inicial: preferentemente en parada origen, luego en Tuluá
  const centroLat = paradaOrigen?.latitud ?? 4.0863;
  const centroLon = paradaOrigen?.longitud ?? -76.195;
  const zoomInicial = 15;

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
    <style>
        html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        .leaflet-popup-content-wrapper {
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
            font-size: 12px;
            margin: 0;
        }
        .popup-titulo {
            font-weight: bold;
            color: #1F2937;
            margin-bottom: 4px;
        }
        .popup-dato {
            color: #6B7280;
            font-size: 11px;
        }
    </style>
</head>
<body>
<div id="map"></div>
<script>
    var map = L.map('map').setView([${centroLat}, ${centroLon}], ${zoomInicial});

    // Capa base: OpenStreetMap
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 12
    }).addTo(map);

    // Grupo de capas para actualizar fácilmente
    var capasActualizables = {
        bus: null,
        usuario: null,
        trayecto: null
    };

    // Agregar trayecto
    ${trayectoJS}

    // Agregar paradas
    ${paradasJS}

    // Agregar origen y destino
    ${origenJS}
    ${destinoJS}

    // Agregar posiciones
    ${busJS}
    ${usuarioJS}

    // Listener para mensajes desde React Native
    window.addEventListener('message', function(event) {
        try {
            var datos = JSON.parse(event.data);

            if (datos.tipo === 'actualizarUbicacionBus') {
                if (capasActualizables.bus) {
                    map.removeLayer(capasActualizables.bus);
                }
                capasActualizables.bus = L.marker([datos.latitud, datos.longitud], {
                    icon: crearIconoBus(),
                    zIndexOffset: 1000
                }).bindPopup(crearPopupBus(datos)).addTo(map);

                // Centrar mapa en bus si está alejado
                if (datos.centrar) {
                    map.setView([datos.latitud, datos.longitud], ${zoomInicial});
                }
            }

            if (datos.tipo === 'actualizarUbicacionUsuario') {
                if (capasActualizables.usuario) {
                    map.removeLayer(capasActualizables.usuario);
                }
                capasActualizables.usuario = L.marker([datos.latitud, datos.longitud], {
                    icon: crearIconoUsuario()
                }).bindPopup('<div class="popup-titulo">Tu ubicación</div>').addTo(map);
            }
        } catch(e) {
            console.error('Error parseando mensaje:', e);
        }
    });

    // Función auxiliar: crear icono del bus
    function crearIconoBus() {
        return L.divIcon({
            className: '',
            html: '<div style="background:#F59E0B;border:3px solid white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚌</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
        });
    }

    function crearIconoUsuario() {
        return L.divIcon({
            className: '',
            html: '<div style="background:#8B5CF6;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -8]
        });
    }

    function crearPopupBus(datos) {
        var tiempoActual = new Date(datos.updated_at).toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit'
        });
        return '<div class="popup-titulo">Posición actual del bus</div>' +
               '<div class="popup-dato">Velocidad: ' + (datos.velocidad || '0') + ' km/h</div>' +
               '<div class="popup-dato">Actualizado: ' + tiempoActual + '</div>';
    }

    console.log('Mapa de ruta del usuario cargado correctamente');
<\/script>
</body>
</html>
  `;
};

/**
 * Genera JavaScript para dibujar el trayecto (LineString) en el mapa.
 * Soporta tanto arrays de coordenadas como WKB.
 */
function generarJSLineaRuta(trayecto, color) {
  // Si es un string (WKB), intentar decodificar
  // Si es un array, usarlo directamente
  let coordenadas = [];

  if (typeof trayecto === 'string') {
    // WKB: implementación simplificada
    // En producción, usar librería 'wkx' o backend RPC
    coordenadas = decodificarWKBLinestring(trayecto);
  } else if (Array.isArray(trayecto)) {
    coordenadas = trayecto.map(p => [p[1], p[0]]); // invertir lon/lat a lat/lon
  }

  if (!coordenadas.length) {
    return '// No hay trayecto disponible';
  }

  return `
    capasActualizables.trayecto = L.polyline(${JSON.stringify(coordenadas)}, {
        color: '${color}',
        weight: 4,
        opacity: 0.8,
        dashArray: 'none'
    }).addTo(map);
    map.fitBounds(${JSON.stringify([
      [Math.min(...coordenadas.map(c => c[0])), Math.min(...coordenadas.map(c => c[1]))],
      [Math.max(...coordenadas.map(c => c[0])), Math.max(...coordenadas.map(c => c[1]))]
    ])}, { padding: [50, 50], maxZoom: 15 });
  `;
}

/**
 * Genera marcador para una parada intermedia.
 */
function generarJSMarcadorParada(parada) {
  if (!parada?.paradas || parada.paradas.latitud == null || parada.paradas.longitud == null) {
    return '';
  }

  const { latitud, longitud, nombre, descripcion } = parada.paradas;
  const orden = parada.orden;

  const popupContent = `
    <div class="popup-titulo">Parada ${orden}: ${nombre}</div>
    ${descripcion ? '<div class="popup-dato">' + descripcion + '</div>' : ''}
    ${parada.tiempo_desde_inicio ? '<div class="popup-dato">Tiempo desde inicio: ' + parada.tiempo_desde_inicio + ' min</div>' : ''}
  `;

  return `
    L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="background:#3B82F6;border:2px solid white;border-radius:50%;width:14px;height:14px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:bold;color:white;">${orden}</div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
            popupAnchor: [0, -7]
        })
    }).bindPopup(\`${popupContent}\`).addTo(map);
  `;
}

/**
 * Genera marcador para parada de origen (punto de subida).
 */
function generarJSMarcadorOrigen(parada) {
  if (!parada?.latitud || !parada?.longitud) return '';

  const { latitud, longitud, nombre } = parada;

  return `
    L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="background:#22C55E;border:3px solid white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:12px;box-shadow:0 2px 8px rgba(34,197,94,0.4);">↑</div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            popupAnchor: [0, -9]
        }),
        zIndexOffset: 500
    }).bindPopup('<div class="popup-titulo">Tu parada de origen</div><div class="popup-dato">${nombre}</div>').openPopup().addTo(map);
  `;
}

/**
 * Genera marcador para parada de destino (punto de bajada).
 */
function generarJSMarcadorDestino(parada) {
  if (!parada?.latitud || !parada?.longitud) return '';

  const { latitud, longitud, nombre } = parada;

  return `
    L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="background:#EF4444;border:3px solid white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:12px;box-shadow:0 2px 8px rgba(239,68,68,0.4);">↓</div>',
            iconSize: [18, 18],
            iconAnchor: [9, 9],
            popupAnchor: [0, -9]
        }),
        zIndexOffset: 500
    }).bindPopup('<div class="popup-titulo">Tu parada de destino</div><div class="popup-dato">${nombre}</div>').addTo(map);
  `;
}

/**
 * Genera marcador para la posición actual del bus.
 */
function generarJSMarcadorBus(bus) {
  if (bus.latitud == null || bus.longitud == null) return '';

  const { latitud, longitud, velocidad, updated_at } = bus;
  const tiempoActual = new Date(updated_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const popupContent = `
    <div class="popup-titulo">Posición actual del bus</div>
    <div class="popup-dato">Velocidad: ${velocidad || '0'} km/h</div>
    <div class="popup-dato">Actualizado: ${tiempoActual}</div>
  `;

  return `
    capasActualizables.bus = L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="background:#F59E0B;border:3px solid white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.3);">🚌</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
            popupAnchor: [0, -10]
        }),
        zIndexOffset: 1000
    }).bindPopup(\`${popupContent}\`).addTo(map);
  `;
}

/**
 * Genera marcador para la posición del usuario.
 */
function generarJSMarcadorUsuario(usuario) {
  if (usuario.latitud == null || usuario.longitud == null) return '';

  const { latitud, longitud } = usuario;

  return `
    capasActualizables.usuario = L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="background:#8B5CF6;border:3px solid white;border-radius:50%;width:16px;height:16px;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
            popupAnchor: [0, -8]
        })
    }).bindPopup('<div class="popup-titulo">Tu ubicación actual</div>').addTo(map);
  `;
}

/**
 * Decodifica un WKB LineString básico.
 * Implementación simplificada; para casos complejos usar librería 'wkx'.
 */
function decodificarWKBLinestring(wkb) {
  // Este es un placeholder
  // En producción:
  // 1. Usar RPC en backend que retorne array JSON
  // 2. O usar librería npm 'wkx' para decodificar en cliente
  // 3. O convertir en backend con ST_AsGeoJSON

  console.warn('WKB decoding no implementado; usar backend RPC con ST_AsGeoJSON');
  return [];
}
