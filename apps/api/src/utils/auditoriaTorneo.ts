/** Valores históricos de `entidad_afectada` usados en logs del torneo. */
export function referenciasEntidadTorneoEnAuditoria(torneoId: string): string[] {
  const id = String(torneoId || "").trim();
  if (!id) return [];
  return [id, `torneo_id: ${id}`, `torneos_id: ${id}`];
}

export function partidoYaTeniaResultado(
  previo:
    | {
        ganador?: string | null;
        estado_partido?: string | null;
        set1_a?: number | null;
        set1_b?: number | null;
      }
    | null
    | undefined,
): boolean {
  if (!previo) return false;
  if (previo.ganador) return true;
  const estado = String(previo.estado_partido || "").trim().toLowerCase();
  if (estado === "finalizado" || estado === "completado") return true;
  return previo.set1_a != null && previo.set1_b != null;
}

export function dedupeAuditoriaPorId<T extends { id: string | number }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  return rows.filter((log) => {
    const logId = String(log.id);
    if (seen.has(logId)) return false;
    seen.add(logId);
    return true;
  });
}
