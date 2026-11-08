/** Formatos con generación de cuadro implementada (Fase 1 / TOR-1). */
export const FORMATOS_TORNEO_CUADRO_FASE1 = [
  "Zonas + Llaves",
  "Eliminatoria Directa",
] as const;

export function formatoTorneoSoportaGeneracionCuadro(
  formato: string | null | undefined,
): boolean {
  const normalizado = (formato || "Zonas + Llaves").trim();
  return (FORMATOS_TORNEO_CUADRO_FASE1 as readonly string[]).includes(
    normalizado,
  );
}
