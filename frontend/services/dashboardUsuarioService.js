import { supabase } from "./supabase";
import * as Location from "expo-location";

//----------------------------------------------------------------------------------------------
//Calcula la distancia en metros entre dos puntos geográficos usando la fórmula de Haversine.
//Para saber qué paradas están cerca del usuario.
//----------------------------------------------------------------------------------------
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

//--------------------------------------------------------------------------------------------------
// Calcula el tiempo estimado de llegada del bus.
//-------------------------------------------------------------------------------------------------
export function calcularETA(distanciaMetros, velocidadKmh = 30) {
  if (!distanciaMetros || distanciaMetros <= 0) return 0;
  const velocidadMpm = (velocidadKmh * 1000) / 60;
  return Math.max(1, Math.round(distanciaMetros / velocidadMpm));
}

//-----------------------------------------------------------------------------------------------------
//Para mostrar horarios legibles al usuario.
// Convierte formato 24h a 12h (ej: "18:30" → "06:30 PM").
//----------------------------------------------------------------------------------------------------
// NUEVA FUNCIÓN: Extrae qué días de la semana opera este horario en texto legible
export const obtenerDiasOperacion = (horario) => {
  if (!horario) return "";
  const dias = [];
  if (horario.lunes) dias.push("Lun");
  if (horario.martes) dias.push("Mar");
  if (horario.miercoles) dias.push("Mié");
  if (horario.jueves) dias.push("Jue");
  if (horario.viernes) dias.push("Vie");
  if (horario.sabado) dias.push("Sáb");
  if (horario.domingo) dias.push("Dom");

  if (dias.length === 7) return "Todos los días";
  if (dias.length === 5 && !horario.sabado && !horario.domingo) return "Lunes a Viernes";
  return dias.join(" - ");
};

export function formatearHora(hora) {
  if (!hora) return "";
  const [h, m] = hora.split(":").map(Number);
  const periodo = h >= 12 ? "PM" : "AM";
  const hora12 = h % 12 === 0 ? 12 : h % 12;
  return `${hora12}:${String(m).padStart(2, "0")} ${periodo}`;
}

//---------------------------------------------------------------------------------------------------------
//Marca una notificación como leída en la base de datos.
//--------------------------------------------------------------------------------------------------------
export async function marcarNotifLeida(notifId) {
  const { error } = await supabase
    .from("notificaciones")
    .update({ leida: true })
    .eq("id", notifId);
  if (error) console.error("Error marcando notif:", error.message);
}

// ─── Ubicación del usuario ────────────────────────────────────────────────────
async function obtenerYGuardarUbicacion(usuarioId) {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permiso de ubicación denegado');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 8000,
    });

    const { latitude: latitud, longitude: longitud } = location.coords;

    await supabase.from("ubicacion_usuario").upsert(
      {
        usuario_id: usuarioId,
        latitud,
        longitud,
        fecha: new Date().toISOString(),
      },
      { onConflict: "usuario_id" }
    );

    return { latitud, longitud };
  } catch (error) {
    throw error;
  }
}

// ─── Función principal ────────────────────────────────────────────────────────
//Obtiene todas las rutas activas cerca de la ubicación del usuario.
export async function getRutasCercanas(usuarioId, radioMetros = 300) {
  try {

    //1. vamos a utulizar la dirrecion guarda de supabaes para saber donde se encuentra el usuario 

    const { data: ubicGuardada, error } = await supabase
      .from('ubicacion_usuario')
      .select("latitud, longitud, direccion")
      .eq("usuario_id", usuarioId)
      .maybeSingle();

    if (error || !ubicGuardada?.latitud || !ubicGuardada?.longitud) {
      throw new Error("El usuario no tiene una dirección guardada aún");
    }

    const { latitud, longitud } = ubicGuardada;

    // 2. Todas las paradas con coordenadas numéricas
    const { data: paradas, error: errorParadas } = await supabase
      .from("paradas")
      .select("id, nombre, latitud, longitud");

    if (errorParadas) throw errorParadas;
    if (!paradas || paradas.length === 0) {
      return [];
    }

    // 3. Filtrar por radio con Haversine
    const paradasCercanas = paradas
      .map((p) => ({
        ...p,
        distancia: haversineDistance(latitud, longitud, p.latitud, p.longitud),
      }))
      .filter((p) => p.distancia <= radioMetros)
      .sort((a, b) => a.distancia - b.distancia);


    if (paradasCercanas.length === 0) return [];

    const idsParadas = paradasCercanas.map((p) => p.id);

    // 4. Rutas que pasan por esas paradas
    const { data: rutaParadas, error: errorRutas } = await supabase
      .from("ruta_paradas")
      .select(`
        parada_id,
        orden,
        tiempo_desde_inicio,
        rutas!inner (
          id,
          numero_ruta,
          nombre,
          color,
          tarifas ( precio ),
          ruta_horarios (
            hora_inicio,
            hora_fin,
            vehiculo_id,
            lunes,
            martes,
            miercoles,
            jueves,
            viernes,
            sabado,
            domingo
          )
        )
      `)
      .in("parada_id", idsParadas);

    if (errorRutas) {
      console.error("Error en consulta de rutas:", errorRutas);
      throw errorRutas;
    }

    if (!rutaParadas || rutaParadas.length === 0) {
      return [];
    }

    // 4.5 Obtener todos los IDs de vehículos y turnos
    const vehiculoIds = new Set();
    for (const rp of rutaParadas) {
      for (const horario of rp.rutas?.ruta_horarios ?? []) {
        if (horario.vehiculo_id) vehiculoIds.add(horario.vehiculo_id);
      }
    }



    // 4.6 Traer datos completos de vehículos
    let vehiculosMap = new Map();
    if (vehiculoIds.size > 0) {
      const respuesta = await supabase
        .from("vehiculos")
        .select(`
            id,
            placa,
            activo,
            conductor:conductor_id (
              id,
              nombre,
              celular
            )
        `)
        .in("id", [...vehiculoIds]);

      // 2. Creamos la variable que tu código de más abajo está esperando para que no falle
      const vehiculosData = respuesta.data;

      if (vehiculosData) {
        vehiculosMap = new Map(vehiculosData.map(v => [v.id, v]));
      }
    }



    // 5. Notificaciones no leídas
    const { data: notificaciones } = await supabase
      .from("notificaciones")
      .select("id, tipo, mensaje, leida, created_at")
      .eq("usuario_id", usuarioId)
      .eq("leida", false)
      .order("created_at", { ascending: false })
      .limit(5);

    // 6. Agrupar por ruta
    const rutasMap = new Map();

    for (const rp of rutaParadas) {
      const ruta = rp.rutas;
      if (!ruta) continue;

      const paradaCercana = paradasCercanas.find((p) => p.id === rp.parada_id);
      if (!paradaCercana) continue;

      const distancia = Math.round(paradaCercana.distancia);

      if (!rutasMap.has(ruta.id)) {
        // Obtener el horario y buscar vehículo/turno en los maps
        const horario = ruta.ruta_horarios?.[0];
        const vehiculo = horario?.vehiculo_id ? vehiculosMap.get(horario.vehiculo_id) : null;
        const conductor = vehiculo?.conductor ?? null;

        // Obtener ubicación del bus
        let busUbic = null;
        try {
          const { data: ubicData } = await supabase
            .rpc("get_ubicacion_conductor_ruta", { p_ruta_id: ruta.id })
            .maybeSingle();
          busUbic = ubicData;
        } catch (rpcError) {
          console.warn("RPC get_ubicacion_conductor_ruta no disponible:", rpcError.message);
        }

        // Calcular ETA
        let etaBus = null;
        if (busUbic?.velocidad > 0 && busUbic?.lat && busUbic?.lon) {
          const distBusParada = haversineDistance(
            busUbic.lat,
            busUbic.lon,
            paradaCercana.latitud,
            paradaCercana.longitud
          );
          etaBus = calcularETA(distBusParada, busUbic.velocidad);
        }
        // CALCULAR DÍAS DE OPERACIÓN
        const diasOperacion = obtenerDiasOperacion(horario || {});


        rutasMap.set(ruta.id, {
          id: ruta.id,
          rutaId: ruta.id,
          numeroRuta: ruta.numero_ruta ?? "N/A",
          nombre: ruta.nombre,
          nombreRuta: ruta.nombre,
          color: ruta.color ?? "#378ADD",
          horarioInicio: horario ? formatearHora(horario.hora_inicio) : null,
          horarioFin: horario ? formatearHora(horario.hora_fin) : null,
          diasOperacion: diasOperacion,
          etaBus: etaBus,
          tarifa: ruta.tarifas?.[0]?.precio ?? null,

          paradaMasCercana: {
            id: paradaCercana.id,
            nombre: paradaCercana.nombre,
            distanciaMetros: distancia,
            eta: rp.tiempo_desde_inicio ?? null,
            latitud: paradaCercana.latitud,
            longitud: paradaCercana.longitud,
          },
          distanciaMetros: distancia,
          distanciaUsuarioParada: distancia,

          bus: vehiculo
            ? {
              placa: vehiculo.placa,
              activo: vehiculo.activo,
              enRuta: busUbic?.en_ruta ?? false,
              velocidad: Number(busUbic?.velocidad ?? 0),
              ubicacion: busUbic ?? null,
            }
            : null,
          conductor: conductor
            ? {
              nombre: conductor.nombre,
              celular: conductor.celular,
            }
            : null,

          notificaciones: notificaciones ?? [],
        });
      } else {
        // Actualizar si esta parada es más cercana
        const existing = rutasMap.get(ruta.id);
        if (distancia < existing.distanciaMetros) {
          existing.distanciaMetros = distancia;
          existing.distanciaUsuarioParada = distancia;
          existing.paradaMasCercana = {
            id: paradaCercana.id,
            nombre: paradaCercana.nombre,
            distanciaMetros: distancia,
            eta: rp.tiempo_desde_inicio ?? null,
            latitud: paradaCercana.latitud,
            longitud: paradaCercana.longitud,
          };
        }
      }
    }

    const rutasOrdenadas = [...rutasMap.values()].sort(
      (a, b) => (a.distanciaMetros || 0) - (b.distanciaMetros || 0)
    );


    return rutasOrdenadas;
  } catch (error) {
    console.error("Error en getRutasCercanas:", error.message);
    return [];
  }
}

// Alias para compatibilidad
export const obtenerRutasCercanas = getRutasCercanas;