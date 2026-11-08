import type { RankingJugador } from "@/utils/types";

/** Categoría con la que abre el ranking público. 7ª y 8ª en la base son de prueba. */
export const CATEGORIA_RANKING_PUBLICO = "6ª";

export const REGLA_DESEMPATE_RANKING =
  "Cada tabla es de una sola categoría. Si empatan en puntos, el orden es alfabético por apellido y, si el apellido coincide, por nombre.";

/**
 * Misma regla que `compararPosicionRanking` en la API:
 * puntos de mayor a menor, después apellido y nombre.
 */
function apellidoValidoParaRanking(apellido?: string | null): boolean {
  const ape = (apellido || "").trim();
  if (ape.length < 2) return false;
  return !/\d/.test(ape);
}

export function compararRankingPublico(
  a: RankingJugador,
  b: RankingJugador,
): number {
  if (a.puntos !== b.puntos) return b.puntos - a.puntos;

  const apellidoA = a.perfiles?.apellido ?? a.apellido;
  const apellidoB = b.perfiles?.apellido ?? b.apellido;
  const aTieneApellido = apellidoValidoParaRanking(apellidoA);
  const bTieneApellido = apellidoValidoParaRanking(apellidoB);
  if (aTieneApellido !== bTieneApellido) {
    return aTieneApellido ? -1 : 1;
  }

  const apellido = (apellidoA || "").trim().localeCompare(
    (apellidoB || "").trim(),
    "es",
    { sensitivity: "base" },
  );
  if (apellido !== 0) return apellido;
  return (a.perfiles?.nombre || a.nombre || "")
    .trim()
    .localeCompare((b.perfiles?.nombre || b.nombre || "").trim(), "es", {
      sensitivity: "base",
    });
}
