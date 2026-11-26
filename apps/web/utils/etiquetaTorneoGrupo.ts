import type { Torneo } from "@/utils/types";
import { etiquetaNivelYCategoria } from "@/utils/etiquetaCategoria";

/** Etiqueta corta nivel + categoría + rama para filas dentro de un evento agrupado. */
export function etiquetaTorneoEnGrupo(torneo: Torneo): string {
  const nivelCat =
    etiquetaNivelYCategoria(torneo.nivel, torneo.categoria) || "Sin nivel";
  const rama = torneo.rama?.trim();
  return [nivelCat, rama].filter(Boolean).join(" · ");
}