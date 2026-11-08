/** Ruta publica de ficha jugador, con contexto opcional desde el ranking. */
export function hrefFichaJugadorPublica(
  usuarioId: string,
  ctx?: { posicion?: number; scope?: string; categoria?: string },
): string {
  if (!usuarioId) return "/ranking";
  const params = new URLSearchParams();
  if (ctx?.posicion != null) params.set("posicion", String(ctx.posicion));
  if (ctx?.scope) params.set("scope", ctx.scope);
  if (ctx?.categoria) params.set("categoria", ctx.categoria);
  const qs = params.toString();
  return `/jugadores/${usuarioId}${qs ? `?${qs}` : ""}`;
}
