import { etiquetaRondaLlave } from "./rondasLlave.ts";
import type { HistorialRanking } from "./types/ranking.types";

/** Etiqueta de puntos en ficha pública (sin sigla de entidad rectora). */
export const ETIQUETA_PUNTOS_FICHA_PUBLICA = "Puntos";

/** Presentación legible del sexo en fichas públicas (PUB-16). */
export function etiquetaSexoPerfil(valor?: string | null): string {
  const v = String(valor || "").trim();
  if (!v) return "—";
  const key = v.toLowerCase();
  if (key === "masculino") return "Masculino";
  if (key === "femenino") return "Femenino";
  if (key === "otro") return "Otro";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function claveCategoria(c?: string | null): string {
  return String(c ?? "")
    .trim()
    .replace(/^>/, "")
    .toUpperCase();
}

/** Verdadero cuando el perfil declara una categoría distinta a la del registro de ranking. */
export function categoriasJuegoYRankingDifieren(
  categoriaJuego?: string | null,
  categoriaRanking?: string | null,
): boolean {
  const juego = claveCategoria(categoriaJuego);
  const ranking = claveCategoria(categoriaRanking);
  if (!juego || !ranking) return false;
  return juego !== ranking;
}

export function subtituloMovimientoHistorial(
  item: Pick<HistorialRanking, "torneo_nombre" | "ronda" | "created_at">,
): string {
  if (item.created_at) {
    return new Date(item.created_at).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  const torneo = item.torneo_nombre?.trim();
  const ronda = item.ronda?.trim();
  if (!torneo && !ronda) return "Movimiento de ranking";
  return "";
}

export function tituloMovimientoHistorial(
  item: Pick<HistorialRanking, "torneo_nombre" | "ronda">,
): string {
  const torneo = item.torneo_nombre?.trim();
  const ronda = item.ronda?.trim();
  if (torneo && ronda) {
    return `${torneo} — ${etiquetaRondaLlave(ronda)}`;
  }
  if (torneo) return torneo;
  if (ronda) return etiquetaRondaLlave(ronda);
  return "Actualización de puntos";
}
