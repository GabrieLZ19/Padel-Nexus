/**
 * Arma un patrón ilike con comillas para filtros `.or()` de PostgREST.
 * Sin comillas, valores con @ o comas rompen el parser del filtro.
 */
export function patronIlikeSql(queryRaw: string): string {
  const q = queryRaw.trim();
  return `%${q.replace(/[%_,]/g, "\\$&")}%`;
}

export function terminoIlikePostgrest(queryRaw: string): string {
  const term = patronIlikeSql(queryRaw);
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

/**
 * Filtro `.or()` solo sobre columnas de `perfiles`.
 * La búsqueda por N° de licencia va aparte (tabla `licencias`) y se une vía `usuarioIdsNroLicencia`.
 * Mezclar `licencias.*` en este or rompe el parser de PostgREST con embed inner.
 */
export function orBusquedaJugadoresLicencias(
  quoted: string,
  usuarioIdsNroLicencia?: string[],
): string {
  const parts = [
    `nombre.ilike.${quoted}`,
    `apellido.ilike.${quoted}`,
    `email.ilike.${quoted}`,
    `dni.ilike.${quoted}`,
  ];
  const ids = (usuarioIdsNroLicencia || []).filter(Boolean);
  if (ids.length > 0) {
    parts.push(`id.in.(${ids.map((id) => `"${id}"`).join(",")})`);
  }
  return parts.join(",");
}
