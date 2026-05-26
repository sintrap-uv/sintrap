// mapaHTML.js

export const generarHtmlMapa = ({ centroInicial, circulosJS, marcadoresJS, marcadorEmpresa, empresaUbicacion }) => {
    const empLat = empresaUbicacion?.lat ?? 4.0863;
    const empLon = empresaUbicacion?.lon ?? -76.195;

    return `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
    <style>
        html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
        .punto-marcador {
            background: #22C55E;
            border: 2px solid white;
            border-radius: 50%;
            width: 12px;
            height: 12px;
        }
    </style>
</head>
<body>
<div id="map"></div>
<script>
    function log(msg) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'log', mensaje: msg }));
    }

    var map = L.map('map').setView([${centroInicial}], 15);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    ${circulosJS}
    ${marcadoresJS}
    ${marcadorEmpresa}

    var marcadoresRuta = [];
    var puntosGuardados = [];
    var segmentosRuta = [];
    var procesandoClick = false;
    var editando = false;
    var modoMapa = 'ruta';
    var marcadoresParada = [];
    var puntosParada = [];

    // Coordenadas fijas de la empresa — origen permanente del trazado
    var EMPRESA_LAT = ${empLat};
    var EMPRESA_LON = ${empLon};
    var puntoAnteriorLat = EMPRESA_LAT;
    var puntoAnteriorLon = EMPRESA_LON;

    // Convierte coordenadas en dirección legible usando Nominatim
    function obtenerDireccion(lat, lon) {
        return fetch(
            'https://nominatim.openstreetmap.org/reverse?lat=' + lat + '&lon=' + lon + '&format=json',
            { headers: { 'User-Agent': 'SintrapApp' } }
        )
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (!data.display_name) return lat.toFixed(4) + ', ' + lon.toFixed(4);
            var partes = data.display_name.split(',');
            return partes.slice(0, 2).join(',').trim();
        })
        .catch(function() {
            return lat.toFixed(4) + ', ' + lon.toFixed(4);
        });
    }

    function agregarMarcadorverde(id, lat, lon) {
        var marcador = L.marker([lat, lon], {
            icon: L.divIcon({ className: 'punto-marcador', iconSize: [12, 12] })
        }).addTo(map);
        marcadoresRuta.push({ id: String(id), marcador: marcador });
    }

    function agregarMarcadorRojo(id, lat, lon) {
        var marcador = L.marker([lat, lon], {
            icon: L.divIcon({
                className: '',
                html: '<div style="background:#EF4444;border:2px solid white;border-radius:50%;width:14px;height:14px;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>',
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            })
        }).addTo(map);
        marcadoresParada.push({ id: String(id), marcador: marcador });
    }

    function limpiarParadas() {
        for (var i = 0; i < marcadoresParada.length; i++) {
            map.removeLayer(marcadoresParada[i].marcador);
        }
        marcadoresParada = [];
        puntosParada = [];
    }

    function redibujarPolyline() {
        map.eachLayer(function(layer) {
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                map.removeLayer(layer);
            }
        });
        for (var i = 0; i < segmentosRuta.length; i++) {
            var seg = segmentosRuta[i];
            var existe = false;
            for (var j = 0; j < puntosGuardados.length; j++) {
                if (puntosGuardados[j].id === seg.id) { existe = true; break; }
            }
            if (existe) {
                L.polyline(seg.puntos, { color: '#22C55E', weight: 4, opacity: 0.8 }).addTo(map);
            }
        }
    }

    function limpiarTodosLosPuntos() {
        for (var i = 0; i < marcadoresRuta.length; i++) {
            map.removeLayer(marcadoresRuta[i].marcador);
        }
        puntosGuardados = [];
        marcadoresRuta = [];
        segmentosRuta = [];
        puntoAnteriorLat = EMPRESA_LAT;
        puntoAnteriorLon = EMPRESA_LON;
        limpiarParadas();
        redibujarPolyline();
    }

    function manejarMensaje(evento) {
        var datos = JSON.parse(evento.data);

        if (datos.tipo === 'setModoEdicion') {
            editando = datos.valor;
            window.editando = datos.valor;
        }

        if (datos.tipo === 'actualizarLinea') {
            limpiarTodosLosPuntos();
            for (var i = 0; i < datos.puntos.length; i++) {
                var p = datos.puntos[i];
                puntosGuardados.push({ id: String(p.id), lat: p.lat, lon: p.lon });
                agregarMarcadorverde(p.id, p.lat, p.lon);
            }
            redibujarPolyline();
        }

        if (datos.tipo === 'setModoMapa') {
            modoMapa = datos.valor;
        }

        if (datos.tipo === 'eliminarParada') {
            var idBuscado = String(datos.id);
            for (var i = 0; i < marcadoresParada.length; i++) {
                if (marcadoresParada[i].id === idBuscado) {
                    map.removeLayer(marcadoresParada[i].marcador);
                    marcadoresParada.splice(i, 1);
                    break;
                }
            }
            puntosParada = puntosParada.filter(function(p) { return String(p.id) !== idBuscado; });
        }

        if (datos.tipo === 'limpiarParadas') {
            limpiarParadas();
        }

        if (datos.tipo === 'eliminarPunto') {
            var idBuscado = String(datos.id);

            var idxMarcador = -1;
            for (var i = 0; i < marcadoresRuta.length; i++) {
                if (marcadoresRuta[i].id === idBuscado) { idxMarcador = i; break; }
            }
            var idxPunto = -1;
            for (var i = 0; i < puntosGuardados.length; i++) {
                if (puntosGuardados[i].id === idBuscado) { idxPunto = i; break; }
            }

            if (idxMarcador !== -1) {
                map.removeLayer(marcadoresRuta[idxMarcador].marcador);
                marcadoresRuta.splice(idxMarcador, 1);
            }
            if (idxPunto !== -1) {
                puntosGuardados.splice(idxPunto, 1);
            }
            var idxSegmento = -1;
            for (var i = 0; i < segmentosRuta.length; i++) {
                if (segmentosRuta[i].id === idBuscado) { idxSegmento = i; break; }
            }
            if (idxSegmento !== -1) {
                segmentosRuta.splice(idxSegmento, 1);
            }

            if (puntosGuardados.length > 0) {
                var ultimoPunto = puntosGuardados[puntosGuardados.length - 1];
                puntoAnteriorLat = ultimoPunto.lat;
                puntoAnteriorLon = ultimoPunto.lon;
            } else {
                puntoAnteriorLat = EMPRESA_LAT;
                puntoAnteriorLon = EMPRESA_LON;
            }

            redibujarPolyline();
        }

        if (datos.tipo === 'limpiarTodo') {
            limpiarTodosLosPuntos();
            limpiarParadas();
        }
    }

    window.addEventListener('message', manejarMensaje);
    document.addEventListener('message', manejarMensaje);

    map.on('click', function(e) {
        if (!editando || procesandoClick) return;

        // ── MODO PARADAS (paso 4) ──────────────────────────────────────
        if (modoMapa === 'paradas') {
            var lat = e.latlng.lat;
            var lon = e.latlng.lng;
            var nuevoId = String(Date.now());
            agregarMarcadorRojo(nuevoId, lat, lon);
            puntosParada.push({ id: nuevoId, lat: lat, lon: lon });

            // Obtener dirección y enviar a React Native
            obtenerDireccion(lat, lon).then(function(direccion) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    tipo: 'nuevaParada',
                    id: nuevoId,
                    lat: lat,
                    lon: lon,
                    direccion: direccion
                }));
            });
            return;
        }

        // ── MODO RUTA (paso 3) ─────────────────────────────────────────
        procesandoClick = true;

        var lat = e.latlng.lat;
        var lon = e.latlng.lng;

        window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: true }));

        if (puntosGuardados.length === 0) {
            puntoAnteriorLat = EMPRESA_LAT;
            puntoAnteriorLon = EMPRESA_LON;
        } else {
            var ultimo = puntosGuardados[puntosGuardados.length - 1];
            puntoAnteriorLat = ultimo.lat;
            puntoAnteriorLon = ultimo.lon;
        }

        fetch('https://router.project-osrm.org/nearest/v1/driving/' + lon + ',' + lat)
            .then(function(r) { return r.json(); })
            .then(function(datos) {
                var callelon = datos.waypoints[0].location[0];
                var calleLat = datos.waypoints[0].location[1];
                var url = 'https://router.project-osrm.org/route/v1/driving/'
                    + puntoAnteriorLon + ',' + puntoAnteriorLat
                    + ';' + callelon + ',' + calleLat + '?geometries=geojson';
                return fetch(url)
                    .then(function(r) { return r.json(); })
                    .then(function(ruta) { return { ruta: ruta, calleLat: calleLat, callelon: callelon }; });
            })
            .then(function(data) {
                var nuevoId = String(Date.now());

                if (data.ruta.routes && data.ruta.routes.length > 0) {
                    var puntos = data.ruta.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                    L.polyline(puntos, { color: '#22C55E', weight: 4 }).addTo(map);
                    segmentosRuta.push({ id: nuevoId, puntos: puntos });
                    window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'trazoExitoso', mensaje: 'Ruta dibujada' }));
                } else {
                    L.polyline(
                        [[puntoAnteriorLat, puntoAnteriorLon], [data.calleLat, data.callelon]],
                        { color: '#22C55E', weight: 4, dashArray: '5,5' }
                    ).addTo(map);
                }

                puntoAnteriorLat = data.calleLat;
                puntoAnteriorLon = data.callelon;

                agregarMarcadorverde(nuevoId, data.calleLat, data.callelon);
                puntosGuardados.push({ id: nuevoId, lat: data.calleLat, lon: data.callelon });

                // Obtener dirección y enviar a React Native
                obtenerDireccion(data.calleLat, data.callelon).then(function(direccion) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        id: nuevoId,
                        lat: data.calleLat,
                        lon: data.callelon,
                        direccion: direccion
                    }));
                });

                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: false }));
                procesandoClick = false;
            })
            .catch(function(error) {
                var nuevoId = String(Date.now());
                agregarMarcadorverde(nuevoId, lat, lon);
                puntosGuardados.push({ id: nuevoId, lat: lat, lon: lon });
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'error', mensaje: error.message }));
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    id: nuevoId,
                    lat: lat,
                    lon: lon,
                    direccion: lat.toFixed(4) + ', ' + lon.toFixed(4)
                }));
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: false }));
                procesandoClick = false;
            });
    });

    log('Mapa listo');
<\/script>
</body>
</html>`;
};