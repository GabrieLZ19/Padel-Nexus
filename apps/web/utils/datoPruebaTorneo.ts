/** Alineado con apps/api/src/utils/datoPrueba.ts */
const NOMBRE_TORNEO_PRUEBA =
  /prue|\bqa\b|\btest\b|testing|\bdemo\b|auditor|^asdf/i;

export const AVISO_NOMBRE_TORNEO_PRUEBA =
  "Los nombres de ensayo (QA, prueba, test, testing, demo) no se publican en el sitio público.";

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
