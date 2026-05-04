// useMapaColaboradores.js
import { useState, useEffect, useRef } from "react";
import { ubicacionColaboradores } from "../../../services/colaboradores";
import { agruparPorCercania } from "../../../services/zonas";
import { guardarRutaCompleta } from "../../../services/rutaServices";
import { obtenerUbicacionBuses } from "../../../services/salidaBuses";
import { generarRutaOptima } from "./rutaUtils";
import { useToast } from "../../../context/ToastContext";
import { getAllCountries } from "react-native-international-phone-number";
import { obtenerVehiculos } from "../../../services/vehicleService"
import { getAllDrivers } from "../../../services/driverService";

export const useMapaColaboradores = () => {
    const [colaboradores, setColaboradores] = useState([]);
    const [grupos, setGrupos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [nombreRuta, setNombreRuta] = useState("");
    const [numeroRuta, setNumeroRuta] = useState("");
    const [puntosRuta, setPuntosRuta] = useState([]);
    const [empresaUbicacion, setEmpresaUbicacion] = useState(null);
    const [calculandoRuta, setCalculandoRuta] = useState(false);
    const [panelVisible, setPanelVisible] = useState(true);
    const { showSuccess, showError, showWarning, showInfo } = useToast();
    const webViewRef = useRef(null);
    const modoEdicionRef = useRef(false);
    const [conductores, setConductores] = useState([]);
    const [vehiculos, setVehiculos] = useState([]);
    const [conductorId, setConductorId] = useState(null);
    const [vehiculoId, setVehiculoId] = useState(null);
    const [horaInicio, setHoraInicio] = useState("06:00");
    const [horaFin, setHoraFin] = useState("18:00");

    const cargarDatos = async () => {
        setCargando(true);
        const datos = await ubicacionColaboradores();
        setColaboradores(datos);
        setGrupos(agruparPorCercania(datos, 0.3));
        setEmpresaUbicacion(await obtenerUbicacionBuses());

        const { data: listaConductores } = await getAllDrivers();
        const listaVehiculos = await obtenerVehiculos();
        setConductores(listaConductores || []);
        setVehiculos(listaVehiculos || []);
        setCargando(false);
    };

    useEffect(() => { cargarDatos(); }, []);

    useEffect(() => {
        modoEdicionRef.current = modoEdicion;
        webViewRef.current?.injectJavaScript(`window.editando = ${modoEdicion};`);
    }, [modoEdicion]);

    const enviarAlMapa = (mensaje) =>
        webViewRef.current?.postMessage(JSON.stringify(mensaje));

    const handleRutaOptima = () => {
        const puntosOptimos = generarRutaOptima(grupos, empresaUbicacion);
        if (!puntosOptimos.length) {
            showWarning("No se pudo generar la ruta óptima");
            return;
        }
        setPuntosRuta(puntosOptimos);
        enviarAlMapa({
            tipo: 'actualizarLinea',
            puntos: puntosOptimos.map(p => ({ lat: p.lat, lon: p.lon, id: p.id }))
        });
        setModoEdicion(true);
        showSuccess(`Ruta óptima generada con ${puntosOptimos.length} puntos`);
    };

    const eliminarPunto = (id) => {
        // CORREGIDO: comparar siempre como string en ambos lados
        const idStr = String(id);
        const nuevosPuntos = puntosRuta.filter(p => String(p.id) !== idStr);
        setPuntosRuta(nuevosPuntos);

        // CORREGIDO: además de eliminarPunto, enviar actualizarLinea con puntos restantes
        // para que la polyline se redibuje correctamente sin puntos fantasma
        enviarAlMapa({ tipo: 'eliminarPunto', id: idStr });
        enviarAlMapa({
            tipo: 'actualizarLinea',
            puntos: nuevosPuntos.map(p => ({ lat: p.lat, lon: p.lon, id: String(p.id) }))
        });

        showInfo('Punto eliminado');
    };
    const limpiarPuntos = () => {
        if (!puntosRuta.length) { showInfo('No hay puntos para limpiar'); return; }
        setPuntosRuta([]);
        enviarAlMapa({ tipo: 'limpiarTodo' });
        showInfo('Todos los puntos han sido eliminados');
    };

    const guardarRuta = async () => {
        if (!nombreRuta.trim()) { showError("El nombre de la ruta es obligatorio"); return; }
        if (!puntosRuta.length) { showWarning('Debes seleccionar al menos un punto'); return; }
        if (!conductorId) { showError("Debes seleccionar un conductor"); return; }
        if (!vehiculoId) { showError("Debes seleccionar un vehículo"); return; }
         try {
        await guardarRutaCompleta(nombreRuta, numeroRuta, puntosRuta, conductorId, vehiculoId, horaInicio, horaFin);
        showSuccess(`Ruta "${nombreRuta}" guardada exitosamente`);
        // limpiar estados...
    } catch (error) {
        // Mensaje específico según el error
        if (error?.code === '23505') {
            showError(`Ya existe una ruta con el número ${numeroRuta}`);
        } else {
            showError('Error al guardar la ruta');
        }
    }
    };

    const onMensajeMapa = (event) => {
        try {
            const mensaje = JSON.parse(event.nativeEvent.data);
            if (mensaje.tipo === 'loading') { setCalculandoRuta(mensaje.estado); return; }
            if (mensaje.tipo === 'error') { showError(mensaje.mensaje); return; }
            if (mensaje.tipo === 'trazoExitoso') return;
            if (modoEdicionRef.current && mensaje.id && mensaje.lat && mensaje.lon) {
                console.log('TIPO DE ID:', typeof mensaje.id, 'VALOR:', mensaje.id); // ← agrega esto
                setPuntosRuta(prev => [...prev, { id: mensaje.id, lat: mensaje.lat, lon: mensaje.lon }]);
            }
        } catch { /* mensaje no JSON */ }
    };

    return {
        colaboradores, grupos, cargando,
        modoEdicion, setModoEdicion,
        nombreRuta, setNombreRuta,
        numeroRuta, setNumeroRuta,
        puntosRuta, empresaUbicacion, calculandoRuta,
        panelVisible, setPanelVisible,
        webViewRef, onMensajeMapa,
        handleRutaOptima, eliminarPunto, limpiarPuntos, guardarRuta,
        showInfo,
        conductores, vehiculos,          // ← estos
        conductorId, setConductorId,
        vehiculoId, setVehiculoId,
        horaInicio, setHoraInicio,
        horaFin, setHoraFin,
    };
};