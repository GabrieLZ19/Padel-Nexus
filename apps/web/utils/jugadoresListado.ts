/**
 * Presupuesto vertical de /dashboard/jugadores a 1366×641.
 * El cromo es el alto que no es una fila: padding, título, filtros,
 * encabezado de la tabla y paginación.
 *
 *   py-3                 24
 *   título h-10          40
 *   gap                  8
 *   filtros h-9          36
 *   gap                  8
 *   thead h-8            32
 *   gap                  8
 *   paginación mt-4      16
 *   paginación py-2      36
 *   margen               52
 *                        ——
 *                        260
 */
export const PAGE_SIZE_JUGADORES = 15;
export const ALTO_FILA_JUGADOR_PX = 36;
export const ALTO_CROMO_JUGADORES_PX = 260;

export function filasJugadoresVisibles(altoViewportPx: number): number {
  const libre = altoViewportPx - ALTO_CROMO_JUGADORES_PX;
  if (libre <= 0) return 0;
  return Math.floor(libre / ALTO_FILA_JUGADOR_PX);
}
