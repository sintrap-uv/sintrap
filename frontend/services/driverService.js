 import { supabase } from "./supabase";
import { getVehiculosDisponibles } from "./vehicleService";
// ─────────────────────────────────────────────
// OBTENER TODOS LOS CONDUCTORES
// ─────────────────────────────────────────────

/**
 * Trae todos los perfiles con rol='conductor' e incluye
 * la placa del vehículo asignado (si existe).
 *
 * Join: profiles ←→ vehiculos (conductor_id = profiles.id)
 *
 * @returns {Promise<{ data: Array|null, error: object|null }>}
 */
export async function getAllDrivers() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      nombre,
      cedula,
      celular,
      activo,
      vehiculos ( placa )
    `,
    )
    .eq("rol", "conductor")
    .order("nombre", { ascending: true });

  if (error) {
    console.error("driverService.getAllDrivers:", error.message);
    return { data: null, error };
  }

  // Aplanar: conductor.placa en lugar de conductor.vehiculos[0].placa
  const conductores = data.map((c) => ({
    ...c,
    placa: c.vehiculos?.[0]?.placa ?? null,
    vehiculos: undefined, // limpiar el objeto anidado
  }));

  return { data: conductores, error: null };
}

// CREAR CUENTA DE CONDUCTOR

/**
 * Crea credenciales en Supabase Auth e inserta el perfil
 * en la tabla 'profiles' con rol='conductor'.
 *
 * IMPORTANTE: signUp no inicia sesión del admin — usa la
 * Service Role key en el cliente si necesitas evitar
 * que Supabase cambie la sesión activa (configurable en
 * el cliente de supabase.js con autoRefreshToken: false).
 *
 * @param {{ nombre: string, cedula: string, celular: string, email: string, password: string }} datos
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createDriverAccount2(datos) {
  const { nombre, cedula, celular, email, password } = datos;

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        // estos son los "raw_user_meta_data" que trigger ya sabe leer
        nombre: nombre.trim(),
        cedula: cedula.trim(),
        celular: celular.trim(),
        rol: "conductor",
      },
    },
  });

  if (authError) {
    console.error(
      "driverService.createDriverAccount (auth):",
      authError.message,
    );
    return { data: null, error: authError };
  }

  const userId = authData.user?.id;
  if (!userId) {
    return {
      data: null,
      error: { message: "No se pudo obtener el ID del usuario creado." },
    };
  }

  return { data: authData, error: null };
}

/**
 * Crea una cuenta de conductor via Edge Function.
 * El admin NO pierde su sesión porque la función usa service_role en el servidor.
 *
 * @param {{ nombre, cedula, celular, email, password }} datos
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createDriverAccount(datos) {
  const { nombre, cedula, celular, email, password } = datos;

  const { data, error } = await supabase.functions.invoke("create-conductor", {
    body: {
      nombre: nombre.trim(),
      cedula: cedula.trim(),
      celular: celular.trim(),
      email: email.trim().toLowerCase(),
      password,
    },
  });

  if (error) {
    console.error("driverService.createDriverAccount:", error.message);
    return { data: null, error };
  }

  // La Edge Function devuelve { success: true, conductor: { id, email, nombre } }
  return { data: data.conductor, error: null };
}

// ACTUALIZAR DATOS DE CONDUCTOR

/**
 * Actualiza los campos editables de un conductor.
 *
 * @param {string} conductorId  - UUID del conductor
 * @param {{ nombre: string, cedula: string, celular: string }} cambios
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateDriver(conductorId, cambios) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      nombre: cambios.nombre?.trim(),
      cedula: cambios.cedula?.trim(),
      celular: cambios.celular?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", conductorId)
    .select()
    .single();

  if (error) {
    console.error("driverService.updateDriver:", error.message);
  }

  return { data: data ?? null, error: error ?? null };
}

// ACTIVAR / DESACTIVAR CONDUCTOR

/**
 * Invierte el valor del campo 'activo' de un conductor.
 *
 * @param {string}  conductorId  - UUID del conductor
 * @param {boolean} estadoActual - Valor actual de 'activo'
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
 export async function toggleDriverStatus(conductorId, estadoActual) {
  
  // ── Validación: no desactivar si tiene turno activo ──
  if (estadoActual === true) {
    const { data: turnosActivos, error: turnoError } = await supabase
      .from('turnos')
      .select('id, estado')
      .eq('conductor_id', conductorId)
      .in('estado', ['programado','en_curso']);
      console.log('TURNOS DEL CONDUCTOR:' , turnosActivos);

    if (turnoError) {
      console.error('driverService.toggleDriverStatus (validación):', turnoError.message);
      return { data: null, error: turnoError };
    }

    if (turnosActivos && turnosActivos.length > 0) {
      return {
        data: null,
        error: {
          message: 'No se puede desactivar el conductor porque tiene un turno activo en curso.'
        }
      };
    }
  }

  // ── Si no tiene turnos activos, procede a cambiar estado ──
  const { data, error } = await supabase
    .from('profiles')
    .update({
      activo: !estadoActual,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conductorId)
    .select()
    .single();

  if (error) {
    console.error('driverService.toggleDriverStatus:', error.message);
  }

  return { data: data ?? null, error: error ?? null };
}

//=======================================================================================
//  Conductores disponibles por horario Y días
// Un conductor no está disponible si su vehículo ya está ocupado en ese horario y días
//=========================================================================================
export async function getConductoresDisponibles(horaInicio, horaFin, diasSeleccionados = {}) {

  if (!horaInicio || !horaFin) return [];

  const vehiculosDisponibles = await getVehiculosDisponibles(horaInicio, horaFin, diasSeleccionados);
  const conductoresIds = vehiculosDisponibles
    .map(v => v.conductor_id)
    .filter(id => id != null);

  if (conductoresIds.length === 0) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nombre ')
    .eq('rol', 'conductor')
    .eq('activo', true)
    .in('id', conductoresIds)

  if (error) throw error;

  return data || [];

} 