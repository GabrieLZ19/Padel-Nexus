/**
 * Arma un patrón ilike con comillas para filtros `.or()` de PostgREST.
 * Sin comillas, valores con @ o comas rompen el parser del filtro.
 */
export function terminoIlikePostgrest(queryRaw: string): string {
  const q = queryRaw.trim();
  const term = `%${q.replace(/[%_,]/g, "\\$&")}%`;
  return `"${term.replace(/"/g, '\\"')}"`;
}

/** Búsqueda del listado de jugadores/licencias (federación, superadmin, provincial). */
export function orBusquedaContactosAdmin(quoted: string): string {
  return [
    `nombre.ilike.${quoted}`,
    `apellido.ilike.${quoted}`,
    `email.ilike.${quoted}`,
    `dni.ilike.${quoted}`,
  ].join(",");
}

export function orBusquedaJugadoresLicencias(quoted: string): string {
  return [
    `nombre.ilike.${quoted}`,
    `apellido.ilike.${quoted}`,
    `email.ilike.${quoted}`,
    `dni.ilike.${quoted}`,
    `licencias.nro_licencia.ilike.${quoted}`,
  ].join(",");
}
