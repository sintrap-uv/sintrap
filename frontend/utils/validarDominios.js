// Este array es para editar los dominios permitidos en el registro de usuarios.
const DOMINIOS_PERMITIDOS = [
  "gmail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "univalle.edu.co",
  "empresa.com" // este es un ejemplo, reemplaza con dominios reales cuando sea necesario
]

export const validarDominioEmail = (email) => {
  const dominio = email.split("@")[1]?.toLowerCase()

  if (!dominio) return {valido: false, error: "El correo es inválido." + "\n" + "Asegúrate de incluir un dominio valido." + "\n" + "Dominios permitidos: " + DOMINIOS_PERMITIDOS.join(", ")}
  
  if (!DOMINIOS_PERMITIDOS.includes(dominio)) {
    return {
      valido: false,
      mensaje: `El dominio "@${dominio}" no está permitido.`
    }
  }

  return {valido: true, mensaje: null}
}