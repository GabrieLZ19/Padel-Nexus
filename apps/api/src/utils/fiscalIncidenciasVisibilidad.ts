export type AsignacionFiscalTorneo = {
  torneo_id: string;
  rol: string;
};

/**
 * Auxiliares solo ven informes que emitieron; el fiscal general ve todos en torneos asignados.
 */
export function filtrarIncidenciasVisiblesPorFiscal<
  T extends { torneo_id: string; fiscal_id: string },
>(incidencias: T[], fiscalId: string, asignaciones: AsignacionFiscalTorneo[]): T[] {
  if (incidencias.length === 0) return incidencias;
  if (!asignaciones.length) return [];

  const generalPorTorneo = new Set(
    asignaciones.filter((a) => a.rol === "general").map((a) => a.torneo_id),
  );
  const torneosAsignados = new Set(asignaciones.map((a) => a.torneo_id));

  return incidencias.filter((inc) => {
    if (!torneosAsignados.has(inc.torneo_id)) return false;
    if (generalPorTorneo.has(inc.torneo_id)) return true;
    return inc.fiscal_id === fiscalId;
  });
}

export function debeFiltrarIncidenciasPorEmisor(
  rolTorneo?: "general" | "auxiliar",
): boolean {
  return rolTorneo !== "general";
}
