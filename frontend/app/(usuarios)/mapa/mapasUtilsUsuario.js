/**
 * Calcula la parada más cercana a la posición del usuario.
 * Usa la fórmula de Haversine para distancia entre coordenadas.
 */
export const calcularParadaMasCercana = (ubicacionUsuario, paradas) => {
  if (!ubicacionUsuario || !paradas || paradas.length === 0) return null;

  const haversine = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  let paradaMasCercana = null;
  let distanciaMinima = Infinity;

  paradas.forEach((parada) => {
    if (parada.paradas?.latitud && parada.paradas?.longitud) {
      const distancia = haversine(
        ubicacionUsuario.latitud,
        ubicacionUsuario.longitud,
        parada.paradas.latitud,
        parada.paradas.longitud,
      );
      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        paradaMasCercana = {
          ...parada,
          distancia: Math.round(distancia * 1000),
        };
      }
    }
  });

  return paradaMasCercana;
};

/**
 * Genera el HTML de Leaflet para visualizar la ruta asignada del usuario.
 */
export const generarHtmlMapaRutaUsuario = ({
  rutaTrayecto,
  paradas = [],
  paradaOrigen,
  paradaDestino,
  ubicacionUsuario,
  ubicacionBus,
  paradaMasCercana,
  colorRuta = "#3B82F6",
}) => {
  const paradasJS = paradas
    .map((p) =>
      generarJSMarcadorParada(
        p,
        paradaMasCercana?.paradas?.id === p.paradas?.id,
      ),
    )
    .join("\n");

  const origenJS = paradaOrigen ? generarJSMarcadorOrigen(paradaOrigen) : "";
  const destinoJS = paradaDestino
    ? generarJSMarcadorDestino(paradaDestino)
    : "";
  const busJS = ubicacionBus ? generarJSMarcadorBus(ubicacionBus) : "";
  const usuarioJS = ubicacionUsuario
    ? generarJSMarcadorUsuario(ubicacionUsuario)
    : "";

  const centroLat = paradaOrigen?.latitud ?? 4.0863;
  const centroLon = paradaOrigen?.longitud ?? -76.195;
  const zoomInicial = 14;

  const coordenadasParadas = paradas
    .sort((a, b) => a.orden - b.orden)
    .filter((p) => p.paradas?.latitud && p.paradas?.longitud)
    .map((p) => ({ lat: p.paradas.latitud, lon: p.paradas.longitud }));

  const coordenadasParadasJS = JSON.stringify(coordenadasParadas);
  const paradaMasCercanaJS = JSON.stringify(paradaMasCercana);

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
            width: 100%; height: 100%;
            margin: 0; padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Pulso para parada más cercana */
        @keyframes pulse {
            0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.7); }
            70%  { box-shadow: 0 0 0 10px rgba(245,158,11,0); }
            100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
        }
        .pulse-marker { animation: pulse 2s infinite; border-radius: 50%; }

        /* Pulso para ubicación del usuario */
        @keyframes pulseUser {
            0%   { box-shadow: 0 0 0 0 rgba(139,92,246,0.6); }
            70%  { box-shadow: 0 0 0 12px rgba(139,92,246,0); }
            100% { box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        .pulse-user { animation: pulseUser 2s infinite; border-radius: 50%; }

        .leaflet-popup-content-wrapper {
            border-radius: 12px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            border: none;
        }
        .leaflet-popup-content {
            margin: 10px 14px;
            font-size: 12px;
        }
        .popup-titulo {
            font-weight: 700;
            color: #111827;
            font-size: 13px;
            margin-bottom: 5px;
        }
        .popup-dato {
            color: #6B7280;
            font-size: 11px;
            margin: 2px 0;
            line-height: 1.5;
        }
        .popup-badge {
            display: inline-block;
            border-radius: 6px;
            padding: 2px 7px;
            font-size: 10px;
            font-weight: 700;
            margin-top: 5px;
        }
        .popup-badge-near    { background: #FEF3C7; color: #92400E; }
        .popup-badge-origen  { background: #DCFCE7; color: #15803D; }
        .popup-badge-destino { background: #FEE2E2; color: #B91C1C; }
        .popup-badge-bus     { background: #FEF3C7; color: #92400E; }
        .leaflet-popup-tip   { background: white; }
    </style>
</head>
<body>
<div id="map"></div>
<script>
    var map = L.map('map', { zoomControl: false }).setView([${centroLat}, ${centroLon}], ${zoomInicial});

    // Control de zoom en esquina inferior derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 11
    }).addTo(map);

    var capasActualizables = { bus: null, usuario: null, trayecto: null };
    var paradasOrdenadas   = ${coordenadasParadasJS};
    var paradaMasCercana   = ${paradaMasCercanaJS};

    // ── Trazado OSRM ──────────────────────────────────────────────────────
    function dibujarRutaOSRM() {
        if (paradasOrdenadas.length < 2) return;

        var coordsString = paradasOrdenadas
            .map(function(p) { return p.lon + ',' + p.lat; })
            .join(';');

        fetch('https://router.project-osrm.org/route/v1/driving/' + coordsString + '?geometries=geojson&overview=full')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.routes && data.routes.length > 0) {
                    var coords = data.routes[0].geometry.coordinates.map(function(p) {
                        return [p[1], p[0]];
                    });
                    // Sombra de la ruta
                    L.polyline(coords, { color: 'rgba(0,0,0,0.12)', weight: 8, opacity: 1 }).addTo(map);
                    // Línea principal
                    capasActualizables.trayecto = L.polyline(coords, {
                        color: '${colorRuta}',
                        weight: 5,
                        opacity: 0.9,
                    }).addTo(map);
                    map.fitBounds(capasActualizables.trayecto.getBounds(), {
                        padding: [60, 60],
                        maxZoom: 16
                    });
                } else {
                    dibujarRutaDirecta();
                }
            })
            .catch(function() { dibujarRutaDirecta(); });
    }

    function dibujarRutaDirecta() {
        if (paradasOrdenadas.length < 2) return;
        capasActualizables.trayecto = L.polyline(
            paradasOrdenadas.map(function(p) { return [p.lat, p.lon]; }),
            { color: '${colorRuta}', weight: 4, opacity: 0.6, dashArray: '8,6' }
        ).addTo(map);
    }

    // ── Marcadores ────────────────────────────────────────────────────────
    ${paradasJS}
    ${origenJS}
    ${destinoJS}
    ${busJS}
    ${usuarioJS}

    dibujarRutaOSRM();

    // ── Mensajes desde React Native ───────────────────────────────────────
    function manejarMensaje(event) {
        try {
            var datos = JSON.parse(event.data);

            if (datos.tipo === 'actualizarUbicacionBus') {
                if (capasActualizables.bus) map.removeLayer(capasActualizables.bus);
                capasActualizables.bus = L.marker([datos.latitud, datos.longitud], {
                    icon: iconBus(),
                    zIndexOffset: 1000
                }).bindPopup(popupBus(datos)).addTo(map);
                if (datos.centrar) map.flyTo([datos.latitud, datos.longitud], 16, { duration: 1 });
            }

            if (datos.tipo === 'actualizarUbicacionUsuario') {
                if (capasActualizables.usuario) map.removeLayer(capasActualizables.usuario);
                capasActualizables.usuario = L.marker([datos.latitud, datos.longitud], {
                    icon: iconUsuario()
                }).bindPopup('<div class="popup-titulo">Tu ubicación</div>').addTo(map);
            }

            if (datos.tipo === 'centrarMapa') {
                map.flyTo([datos.lat, datos.lon], 17, { duration: 1.2 });
            }
        } catch(e) {}
    }

    window.addEventListener('message', manejarMensaje);
    document.addEventListener('message', manejarMensaje);

    // ── Iconos ────────────────────────────────────────────────────────────
    function iconBus() {
        return L.divIcon({
            className: '',
            html: '<div style="width:36px;height:36px;background:#F59E0B;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 8px rgba(245,158,11,0.5);">🚌</div>',
            iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20]
        });
    }
    function iconUsuario() {
        return L.divIcon({
            className: 'pulse-user',
            html: '<div style="width:18px;height:18px;background:#8B5CF6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(139,92,246,0.5);"></div>',
            iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10]
        });
    }
    function popupBus(datos) {
        var t = datos.updated_at
            ? new Date(datos.updated_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : '--:--';
        return '<div class="popup-titulo">Bus en ruta</div>' +
               '<div class="popup-dato">Velocidad: <strong>' + (datos.velocidad || 0) + ' km/h</strong></div>' +
               '<div class="popup-dato">Actualizado: ' + t + '</div>' +
               '<span class="popup-badge popup-badge-bus">EN LÍNEA</span>';
    }

    console.log('Mapa cargado');
<\/script>
</body>
</html>
  `;
};

// ── Marcadores ────────────────────────────────────────────────────────────────

function generarJSMarcadorParada(parada, esMasCercana = false) {
  if (!parada?.paradas?.latitud || !parada?.paradas?.longitud) return "";

  const { latitud, longitud, nombre, descripcion } = parada.paradas;
  const orden = parada.orden;

  const color = esMasCercana ? "#F59E0B" : "#3B82F6";
  const size = esMasCercana ? 20 : 14;
  const clase = esMasCercana ? "pulse-marker" : "";
  const badge = esMasCercana
    ? '<span class="popup-badge popup-badge-near">Estás cerca</span>'
    : "";

  const popup = `
    <div class="popup-titulo">P${orden}: ${nombre}</div>
    ${descripcion ? '<div class="popup-dato">' + descripcion + "</div>" : ""}
    ${parada.tiempo_desde_inicio != null ? '<div class="popup-dato">' + parada.tiempo_desde_inicio + " min desde inicio</div>" : ""}
    ${badge}
  `;

  return `
    L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '${clase}',
            html: '<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${size <= 14 ? 8 : 10}px;font-weight:700;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,0.25);">${orden}</div>',
            iconSize: [${size}, ${size}],
            iconAnchor: [${size / 2}, ${size / 2}],
            popupAnchor: [0, -${size / 2 + 2}]
        })
    }).bindPopup(\`${popup}\`).addTo(map);
  `;
}

function generarJSMarcadorOrigen(parada) {
  if (!parada?.latitud || !parada?.longitud) return "";
  const { latitud, longitud, nombre } = parada;
  return `
    L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="width:24px;height:24px;background:#22C55E;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(34,197,94,0.5);"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="12" y2="8"/><line x1="16" y1="12" x2="12" y2="8"/></svg></div>',
            iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -14]
        }),
        zIndexOffset: 600
    }).bindPopup('<div class="popup-titulo">Tu parada de origen</div><div class="popup-dato">${nombre}</div><span class="popup-badge popup-badge-origen">ORIGEN</span>').openPopup().addTo(map);
  `;
}

function generarJSMarcadorDestino(parada) {
  if (!parada?.latitud || !parada?.longitud) return "";
  const { latitud, longitud, nombre } = parada;
  return `
    L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="width:24px;height:24px;background:#EF4444;border:3px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(239,68,68,0.5);"><svg width="12" height="12" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
            iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -14]
        }),
        zIndexOffset: 600
    }).bindPopup('<div class="popup-titulo">Tu parada de destino</div><div class="popup-dato">${nombre}</div><span class="popup-badge popup-badge-destino">DESTINO</span>').addTo(map);
  `;
}

function generarJSMarcadorBus(bus) {
  if (bus.latitud == null || bus.longitud == null) return "";
  const { latitud, longitud, velocidad, updated_at } = bus;
  const tiempo = new Date(updated_at).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const popup = `
    <div class="popup-titulo">Bus en ruta</div>
    <div class="popup-dato">Velocidad: <strong>${velocidad || 0} km/h</strong></div>
    <div class="popup-dato">Actualizado: ${tiempo}</div>
    <span class="popup-badge popup-badge-bus">EN LÍNEA</span>
  `;
  return `
    capasActualizables.bus = L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: '',
            html: '<div style="width:36px;height:36px;background:#F59E0B;border-radius:50%;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 3px 8px rgba(245,158,11,0.5);">🚌</div>',
            iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -20]
        }),
        zIndexOffset: 1000
    }).bindPopup(\`${popup}\`).addTo(map);
  `;
}

function generarJSMarcadorUsuario(usuario) {
  if (usuario.latitud == null || usuario.longitud == null) return "";
  const { latitud, longitud } = usuario;
  return `
    capasActualizables.usuario = L.marker([${latitud}, ${longitud}], {
        icon: L.divIcon({
            className: 'pulse-user',
            html: '<div style="width:18px;height:18px;background:#8B5CF6;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(139,92,246,0.5);"></div>',
            iconSize: [18, 18], iconAnchor: [9, 9], popupAnchor: [0, -10]
        })
    }).bindPopup('<div class="popup-titulo">Tu ubicación actual</div>').addTo(map);
  `;
}
