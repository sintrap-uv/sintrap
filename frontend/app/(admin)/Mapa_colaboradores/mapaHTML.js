// mapaHTML.js

export const generarHtmlMapa = ({ centroInicial, circulosJS, marcadoresJS, marcadorEmpresa, empresaUbicacion }) => {
    const empLat = empresaUbicacion?.lat ?? 4.0863;
    const empLon = empresaUbicacion?.lon ?? -76.195;

    return `
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
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
    var lineaActual = null;
    var procesandoClick = false;
    var editando = false;
    var puntoAnteriorLat = ${empLat};
    var puntoAnteriorLon = ${empLon};

    function agregarMarcadorverde(id, lat, lon) {
        var marcador = L.marker([lat, lon], {
            icon: L.divIcon({ className: 'punto-marcador', iconSize: [12, 12] })
        }).addTo(map);
        marcadoresRuta.push({ id: id, marcador: marcador });
    }

    function limpiarLinea() {
        if (lineaActual) { map.removeLayer(lineaActual); lineaActual = null; }
    }

    function dibujarLineaConPuntos() {
        limpiarLinea();
        if (puntosGuardados.length > 1) {
            lineaActual = L.polyline(puntosGuardados, { color: '#22C55E', weight: 4, opacity: 0.8 }).addTo(map);
        }
    }

    function limpiarTodosLosPuntos() {
        puntosGuardados = [];
        limpiarLinea();
        for (var i = 0; i < marcadoresRuta.length; i++) { map.removeLayer(marcadoresRuta[i].marcador); }
        marcadoresRuta = [];
        puntoAnteriorLat = ${empLat};
        puntoAnteriorLon = ${empLon};
    }

    window.addEventListener('message', function(evento) {
        var datos = JSON.parse(evento.data);

        if (datos.tipo === 'setModoEdicion') {
            editando = datos.valor;
            window.editando = datos.valor;
        }

        if (datos.tipo === 'actualizarLinea') {
            for (var i = 0; i < marcadoresRuta.length; i++) { map.removeLayer(marcadoresRuta[i].marcador); }
            marcadoresRuta = [];
            puntosGuardados = [];
            limpiarLinea();
            for (var i = 0; i < datos.puntos.length; i++) {
                puntosGuardados.push([datos.puntos[i].lat, datos.puntos[i].lon]);
                agregarMarcadorverde(datos.puntos[i].id, datos.puntos[i].lat, datos.puntos[i].lon);
            }
            dibujarLineaConPuntos();
        }

        if (datos.tipo === 'eliminarPunto') {
            for (var i = 0; i < marcadoresRuta.length; i++) {
                if (marcadoresRuta[i].id === datos.id) {
                    map.removeLayer(marcadoresRuta[i].marcador);
                    marcadoresRuta.splice(i, 1);
                    puntosGuardados.splice(i, 1);
                    break;
                }
            }
            dibujarLineaConPuntos();
        }

        if (datos.tipo === 'limpiarTodo') {
            limpiarTodosLosPuntos();
        }
    });

    map.on('click', function(e) {
        if (!editando || procesandoClick) return;
        procesandoClick = true;
        var lat = e.latlng.lat;
        var lon = e.latlng.lng;

        window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: true }));

        if (puntosGuardados.length === 0) {
            puntoAnteriorLat = ${empLat};
            puntoAnteriorLon = ${empLon};
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
                if (data.ruta.routes && data.ruta.routes.length > 0) {
                    var puntos = data.ruta.routes[0].geometry.coordinates.map(function(p) { return [p[1], p[0]]; });
                    L.polyline(puntos, { color: '#22C55E', weight: 4 }).addTo(map);
                    window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'trazoExitoso', mensaje: 'Ruta dibujada' }));
                } else {
                    L.polyline([[puntoAnteriorLat, puntoAnteriorLon], [data.calleLat, data.callelon]], 
                        { color: '#22C55E', weight: 4, dashArray: '5,5' }).addTo(map);
                }
                puntoAnteriorLat = data.calleLat;
                puntoAnteriorLon = data.callelon;
                var nuevoId = Date.now();
                agregarMarcadorverde(nuevoId, data.calleLat, data.callelon);
                puntosGuardados.push([data.calleLat, data.callelon]);
                window.ReactNativeWebView.postMessage(JSON.stringify({ id: nuevoId, lat: data.calleLat, lon: data.callelon }));
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: false }));
                procesandoClick = false;
            })
            .catch(function(error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'error', mensaje: error.message }));
                var nuevoId = Date.now();
                agregarMarcadorverde(nuevoId, lat, lon);
                puntosGuardados.push([lat, lon]);
                dibujarLineaConPuntos();
                window.ReactNativeWebView.postMessage(JSON.stringify({ id: nuevoId, lat: lat, lon: lon }));
                window.ReactNativeWebView.postMessage(JSON.stringify({ tipo: 'loading', estado: false }));
                procesandoClick = false;
            });
    });

    log('Mapa listo');
</script>
</body>
</html>`;
};