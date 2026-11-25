/** Misma paleta que `COLORES_CATEGORIA` en `apps/api/src/utils/programacionEvento.ts`. */
export const COLORES_CATEGORIA_EVENTO = [
  "#CBFE01",
  "#60A5FA",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#34D399",
  "#FB7185",
  "#38BDF8",
  "#E879F9",
  "#4ADE80",
] as const;

export function colorCategoriaEvento(
  torneoId: string,
  torneoIds: string[],
): string {
  const idx = torneoIds.indexOf(torneoId);
  if (idx < 0) return COLORES_CATEGORIA_EVENTO[0];
  return COLORES_CATEGORIA_EVENTO[idx % COLORES_CATEGORIA_EVENTO.length];
}