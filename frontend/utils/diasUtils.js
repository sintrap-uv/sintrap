// frontend/utils/diasUtils.js
export const getDiasTexto = (dias) => {
  if (!dias) return 'No especificado';
  
  const { lunes, martes, miercoles, jueves, viernes, sabado, domingo } = dias;
  
  if (lunes && martes && miercoles && jueves && viernes && !sabado && !domingo) {
    return 'Entre semana (Lun - Vie)';
  }
  if (!lunes && !martes && !miercoles && !jueves && !viernes && sabado && domingo) {
    return 'Fines de semana (Sab - Dom)';
  }
  if (lunes && martes && miercoles && jueves && viernes && sabado && domingo) {
    return 'Todos los días';
  }
  
  const diasLista = [];
  if (lunes) diasLista.push('Lun');
  if (martes) diasLista.push('Mar');
  if (miercoles) diasLista.push('Mié');
  if (jueves) diasLista.push('Jue');
  if (viernes) diasLista.push('Vie');
  if (sabado) diasLista.push('Sáb');
  if (domingo) diasLista.push('Dom');
  
  return `${diasLista.join(', ')}`;
};