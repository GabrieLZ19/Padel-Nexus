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

const MAX_TOKENS_BUSQUEDA_JUGADOR = 6;

/**
 * ENT-37 / ENT-49: cada token debe coincidir (AND).
 * Acepta espacios y coma estilo inscripción (`Apellido, Nombre`).
 */
export function tokenizarBusquedaJugadores(search: string): string[] {
  return search
    .trim()
    .split(/[\s,]+/u)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, MAX_TOKENS_BUSQUEDA_JUGADOR);
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
/** Un token sobre perfiles (sin email; nro de licencia vía ids separados). */
export function orBusquedaTokenJugadoresLicencias(
  quoted: string,
  usuarioIdsNroLicencia?: string[],
): string {
  const parts = [
    `nombre.ilike.${quoted}`,
    `apellido.ilike.${quoted}`,
    `dni.ilike.${quoted}`,
  ];
  const ids = (usuarioIdsNroLicencia || []).filter(Boolean);
  if (ids.length > 0) {
    parts.push(`id.in.(${ids.map((id) => `"${id}"`).join(",")})`);
  }
  return parts.join(",");
}

/** @deprecated Preferir orBusquedaTokenJugadoresLicencias por token (ENT-37). */
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
