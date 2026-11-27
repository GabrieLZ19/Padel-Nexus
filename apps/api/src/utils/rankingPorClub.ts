/** Delta de puntos en un movimiento de historial_ranking. */
export function deltaPuntosHistorial(
  puntosAnteriores?: number | null,
  puntosNuevos?: number | null,
): number {
  const ant = Number(puntosAnteriores ?? 0);
  const neu = Number(puntosNuevos ?? 0);
  const delta = neu - ant;
  return Number.isFinite(delta) ? Math.max(0, delta) : 0;
}

export function acumularPuntosHistorialPorUsuario(
  movimientos: ReadonlyArray<{
    usuario_id?: string | null;
    puntos_anteriores?: number | null;
    puntos_nuevos?: number | null;
  }>,
): Map<string, number> {
  const acumulado = new Map<string, number>();
  for (const row of movimientos) {
    const uid = String(row.usuario_id || "").trim();
    if (!uid) continue;
    const prev = acumulado.get(uid) ?? 0;
    acumulado.set(
      uid,
      prev + deltaPuntosHistorial(row.puntos_anteriores, row.puntos_nuevos),
    );
  }
  return acumulado;
}

/** Alcance persistido al otorgar puntos de torneo club (TOR-53). */
export function alcancePersistidoRankingTorneo(
  alcanceRanking: string,
  alcanceExistente?: string | null,
): string {
  if (alcanceExistente) return String(alcanceExistente);
  return alcanceRanking;
}