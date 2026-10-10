import type { RankingJugador } from "@/utils/types";

/** Categoría con la que abre el ranking público. 7ª y 8ª en la base son de prueba. */
export const CATEGORIA_RANKING_PUBLICO = "6ª";

export const REGLA_DESEMPATE_RANKING =
  "Cada tabla es de una sola categoría. Si empatan en puntos, el orden es alfabético por apellido y, si el apellido coincide, por nombre.";

/**
 * Misma regla que `compararPosicionRanking` en la API:
 * puntos de mayor a menor, después apellido y nombre.
 */
export function compararRankingPublico(
  a: RankingJugador,
  b: RankingJugador,
): number {
  if (a.puntos !== b.puntos) return b.puntos - a.puntos;
  const apellido = (a.perfiles?.apellido || a.apellido || "").localeCompare(
    b.perfiles?.apellido || b.apellido || "",
    "es",
    { sensitivity: "base" },
  );
  if (apellido !== 0) return apellido;
  return (a.perfiles?.nombre || a.nombre || "").localeCompare(
    b.perfiles?.nombre || b.nombre || "",
    "es",
    { sensitivity: "base" },
  );
}
