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
    var procesandoClick = false;
    var editando = false;

    // Coordenadas fijas de la empresa — origen permanente del trazado
    var EMPRESA_LAT = ${empLat};
    var EMPRESA_LON = ${empLon};
    var puntoAnteriorLat = EMPRESA_LAT;
    var puntoAnteriorLon = EMPRESA_LON;

    function agregarMarcadorverde(id, lat, lon) {
        var marcador = L.marker([lat, lon], {
            icon: L.divIcon({ className: 'punto-marcador', iconSize: [12, 12] })
        }).addTo(map);
        marcadoresRuta.push({ id: String(id), marcador: marcador });
    }

    function redibujarPolyline() {
        // Eliminar todas las polylines actuales del mapa
        map.eachLayer(function(layer) {
            if (layer instanceof L.Polyline && !(layer instanceof L.Polygon)) {
                map.removeLayer(layer);
            }
        });

        // FIX: siempre incluir la empresa como primer punto del trazado.
        // Antes la condicion era length > 1, lo que omitia el tramo
        // empresa->punto1 cuando solo quedaba 1 punto, borrando ese segmento.
        // Ahora con length >= 1 siempre se dibuja desde la empresa.
        if (puntosGuardados.length >= 1) {
            var coords = [[EMPRESA_LAT, EMPRESA_LON]].concat(
                puntosGuardados.map(function(p) { return [p.lat, p.lon]; })
            );
            L.polyline(coords, { color: '#22C55E', weight: 4, opacity: 0.8 }).addTo(map);
        }
        // Con 0 puntos no se dibuja nada — correcto
    }

    function limpiarTodosLosPuntos() {
        for (var i = 0; i < marcadoresRuta.length; i++) {
            map.removeLayer(marcadoresRuta[i].marcador);
        }
        puntosGuardados = [];
        marcadoresRuta = [];
        puntoAnteriorLat = EMPRESA_LAT;
        puntoAnteriorLon = EMPRESA_LON;
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

            redibujarPolyline();
        }

        if (datos.tipo === 'limpiarTodo') {
            limpiarTodosLosPuntos();
        }
    }

    window.addEventListener('message', manejarMensaje);
    document.addEventListener('message', manejarMensaje);

    map.on('click', function(e) {
        if (!editando || procesandoClick) return;
        procesandoClick = true;

        var lat = e.latlng.lat;
        var lon = e.latlng.lng;

        window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: true }));

        if (puntosGuardados.length === 0) {
            puntoAnteriorLat = EMPRESA_LAT;
            puntoAnteriorLon = EMPRESA_LON;
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

                window.ReactNativeWebView.postMessage(JSON.stringify({ id: nuevoId, lat: data.calleLat, lon: data.callelon }));
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: false }));
                procesandoClick = false;
            })
            .catch(function(error) {
                var nuevoId = String(Date.now());
                agregarMarcadorverde(nuevoId, lat, lon);
                puntosGuardados.push({ id: nuevoId, lat: lat, lon: lon });
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'error', mensaje: error.message }));
                window.ReactNativeWebView.postMessage(JSON.stringify({ id: nuevoId, lat: lat, lon: lon }));
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: false }));
                procesandoClick = false;
            });
    });

    log('Mapa listo');
<\/script>
</body>
</html>`;
};