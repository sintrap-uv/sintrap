export const conductorVacio = {
  id: null, // UUID - Viene de Supabase Auth (no editable)
  nombre: "",
  celular: "",
  genero: null,
  rol: "conductor",
  avatar_url: "",
  cedula: "",
  edad: null,
};

/**
 * Opciones para selector de género
 * Sincronizadas con el ENUM genero_tipo del Database Enumerated Types de supabase
 */
export const GENERO_OPCIONES = [
  { label: "Masculino", value: "masculino" },
  { label: "Femenino", value: "femenino" },
  { label: "Otro", value: "otro" },
  { label: "Prefiero no decir", value: "prefiero_no_decir" },
];

/**
 * Validaciones básicas de los campos del formulario.
 * @param {object} datos - Objto con los datos del formulario
 * @retruns {{ valido: boolean, errores_ object }}
 */
export function validarConductor(datos) {
  const errores = {};

  if (!datos.nombre || datos.nombre.trim().length < 2) {
    errores.nombre = "El nombre es obligatorio (mínimo 2 caracteres)";
  }

  if (!datos.cedula || datos.cedula.trim().length < 6) {
    errores.cedula = "La cédula es obligatoria (mínimo 6 caratectes)";
  }

  if (!datos.celular || datos.celular.trim().length < 7) {
    errores.celular = "El celular es obligatorio (mínimo 7 caracteres)";
  } else if (!/^\d+$/.test(datos.celular.trim())) {
    errores.celular = "El celular debe contener solo números";
  }

  return {
    valido: Object.keys(errores).length === 0,
    errores,
  };
}
