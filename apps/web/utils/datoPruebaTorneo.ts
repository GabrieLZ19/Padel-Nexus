const NOMBRE_TORNEO_PRUEBA = /prue|\bqa\b|testing|\bdemo\b|auditor|^asdf/i;

export function esNombreTorneoDePrueba(nombre?: string | null): boolean {
  return NOMBRE_TORNEO_PRUEBA.test(String(nombre || "").trim());
}

export function torneoVisibleEnSitioPublico(torneo: {
  nombre?: string | null;
  es_prueba?: boolean | null;
}): boolean {
  if (esNombreTorneoDePrueba(torneo.nombre)) return false;
  return torneo.es_prueba === false;
}
