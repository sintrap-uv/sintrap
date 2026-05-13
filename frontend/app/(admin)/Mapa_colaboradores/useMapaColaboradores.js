// useMapaColaboradores.js
import { useState, useEffect, useRef } from "react";
import { ubicacionColaboradores } from "../../../services/colaboradores";
import { agruparPorCercania } from "../../../services/zonas";
import { guardarRutaCompleta } from "../../../services/rutaServices";
import { obtenerUbicacionBuses } from "../../../services/salidaBuses";
import { generarRutaOptima } from "./rutaUtils";
import { useToast } from "../../../context/ToastContext";
import { supabase } from "../../../services/supabase";
import { verificarEstadoVehiculo, verificarConflictoHorarioVehiculo } from '../../../services/rutaServices';
import { getVehiculosDisponibles, getConductoresDisponibles, getVehiculoPorConductor } from "../../../services/vehicleService";

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
    const [conductorId, setConductorId] = useState(null);
    const [vehiculoId, setVehiculoId] = useState(null);
    const [horaInicio, setHoraInicio] = useState("06:00");
    const [horaFin, setHoraFin] = useState("18:00");
    const [turnoId, setTurnoId] = useState(null);
    const [turnos, setTurnos] = useState([]);
    const [puntosParada, setPuntosParada] = useState([]);
    const [diasTipo, setDiasTipo] = useState('entre_semana');
    const [conductoresDisponibles, setConductoresDisponibles] = useState([]);
    const [vehiculosDisponibles, setVehiculosDisponibles] = useState([]);

    //Esto nos va servir para acomadar la hora que vaya poniendo el admin asiganarle un turno como en la tabla de supabase
    // Detecta el turno según la hora de inicio
    const detectarTurno = (hora) => {
        if (!turnos.length) return;
        const [h] = hora.split(':').map(Number);

        let nombreTurno;
        if (h >= 6 && h < 14) nombreTurno = 'mañana';
        else if (h >= 14 && h < 22) nombreTurno = 'tarde';
        else nombreTurno = 'noche';

        const turnoEncontrado = turnos.find(t =>
            t.nombre.toLowerCase().includes(nombreTurno)
        );
        if (turnoEncontrado) setTurnoId(turnoEncontrado.id);
    };

    const handleHoraInicioChange = (hora) => {
        setHoraInicio(hora);
        detectarTurno(hora);
        cargarDisponibles(hora)
    };

    // Función para cargar disponibles según la hora
    const cargarDisponibles = async (hora) => {
        if (!hora) return;
        try {
            const vehiculos = await getVehiculosDisponibles(hora);
            const conductores = await getConductoresDisponibles(hora);
            setVehiculosDisponibles(vehiculos);
            setConductoresDisponibles(conductores);

            // Si el conductor seleccionado ya no está disponible, resetear
            if (conductorId && !conductores.some(c => c.id === conductorId)) {
                setConductorId(null);
                setVehiculoId(null);
                showWarning('El conductor seleccionado ya no está disponible para esta hora');
            }
        } catch (error) {
            console.error('Error cargando disponibles:', error);
        }
    };

    // 2. Cuando el admin escoge conductor, carga su vehículo automáticamente
    const handleConductorChange = async (id) => {
        setConductorId(id);
        setVehiculoId(null); // resetea vehículo anterior
        if (!id) return;
        const vehiculo = await getVehiculoPorConductor(id);
        if (vehiculo) {
            setVehiculoId(vehiculo.id);
        } else {
            showWarning('Este conductor no tiene vehículo asignado');
        }
    };

    const cargarDatos = async () => {
        setCargando(true);
        const datos = await ubicacionColaboradores();
        setColaboradores(datos);
        setGrupos(agruparPorCercania(datos, 0.3));
        setEmpresaUbicacion(await obtenerUbicacionBuses());

      //  const { data: listaConductores } = await getAllDrivers();
       // const listaVehiculos = await obtenerVehiculos();
        setCargando(false);

        const { data: listaTurnos } = await supabase.from('tipos_turno').select('*');
        setTurnos(listaTurnos || [])
    };

    useEffect(() => { cargarDatos(); }, []);

    const sincronizarModoMapa = (pasoActual) => {
        const mapaActivo = pasoActual === 3 || pasoActual === 4;
        modoEdicionRef.current = mapaActivo;
        webViewRef.current?.injectJavaScript(`window.editando = ${mapaActivo};`);
        // Cambiar modo según el paso
        const modo = pasoActual === 4 ? 'paradas' : 'ruta';
        enviarAlMapa({ tipo: 'setModoMapa', valor: modo });
    };

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


        enviarAlMapa({ tipo: 'eliminarPunto', id: idStr });
        showInfo('Punto eliminado');
    };
    const limpiarPuntos = () => {
        if (!puntosRuta.length) { showInfo('No hay puntos para limpiar'); return; }
        setPuntosRuta([]);
        enviarAlMapa({ tipo: 'limpiarTodo' });
        showInfo('Todos los puntos han sido eliminados');
    };
    const verificarNumeroRutaExistente = async (numero) => {
        const { data, error } = await supabase
            .from('rutas')
            .select('id')
            .eq('numero_ruta', numero)
            .maybeSingle();
        if (error) {
            console.error('Error verificando número de ruta:', error);
            return false; // asumimos que no existe por seguridad
        }
        return !!data;
    };

    // Función para eliminar una parada:
    const eliminarParada = (id) => {
        const idStr = String(id);
        setPuntosParada(prev => prev.filter(p => String(p.id) !== idStr));
        enviarAlMapa({ tipo: 'eliminarParada', id: idStr });
        showInfo('Parada eliminada');
    };
    // Función para limpiar todas las paradas:
    const limpiarParadas = () => {
        if (!puntosParada.length) { showInfo('No hay paradas para limpiar'); return; }
        setPuntosParada([]);
        enviarAlMapa({ tipo: 'limpiarParadas' });
        showInfo('Todas las paradas eliminadas');
    };


    const guardarRuta = async () => {
        if (!nombreRuta.trim()) { showError("El nombre de la ruta es obligatorio"); return; }
        if (!puntosRuta.length) { showWarning('Debes seleccionar al menos un punto'); return; }
        if (!conductorId) { showError("Debes seleccionar un conductor"); return; }
        if (!vehiculoId) { showError("Debes seleccionar un vehículo"); return; }
        try {
            await guardarRutaCompleta(
                nombreRuta, numeroRuta,
                puntosRuta, conductorId,
                vehiculoId, horaInicio, horaFin,
                turnoId, puntosParada, diasTipo
            );

            console.log('✅ guardarRutaCompleta terminó sin error');
            //MOstrarmos el mensaje de exito 
            showSuccess(`Ruta "${nombreRuta}" guardada exitosamente`);
            console.log('✅ showSuccess llamado');
            // limpiar estados...
            setNumeroRuta("");
            setNombreRuta("");
            setPuntosParada([]);
            setPuntosRuta([]);
            setConductorId(null);
            setVehiculoId(null);
            setTurnoId(null)
            setModoEdicion(false)
            setDiasTipo('entre_semana');
            enviarAlMapa({ tipo: 'limpiarTodo' });


        } catch (error) {
            // Mensaje específico según el error
            if (error?.code === '23505') {
                showError(`Ya existe una ruta con el número ${numeroRuta}`);
            } else {
                showError(error.message || 'Error al guardar la ruta');
                console.error('❌ Error completo:', error);
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
                if (mensaje.tipo === 'nuevaParada') {
                    setPuntosParada(prev => [...prev, { id: mensaje.id, lat: mensaje.lat, lon: mensaje.lon }]);
                } else {
                    setPuntosRuta(prev => [...prev, { id: mensaje.id, lat: mensaje.lat, lon: mensaje.lon }]);
                }
                return;
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
        vehiculoId, setVehiculoId,
        horaInicio, setHoraInicio,
        horaFin, setHoraFin,
        showError, showWarning,
        turnos, turnoId, setTurnoId,
        conductorId,
        handleConductorChange,
        sincronizarModoMapa,
        puntosParada,
        eliminarParada,
        limpiarParadas,
        diasTipo, setDiasTipo,
        handleHoraInicioChange,
        verificarNumeroRuta: verificarNumeroRutaExistente,
        verificarEstadoVehiculo,
        verificarConflictoHorarioVehiculo,
        conductores: conductoresDisponibles,  // ← antes eran todos los conductores
        vehiculos: vehiculosDisponibles,
    };
};  