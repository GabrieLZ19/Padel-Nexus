/**
 * Nombres de categoría del ranking, como los pide el documento.
 * El valor guardado no cambia: "7ª" sigue siendo "7ª" y "Sub-12" sigue siendo "Sub-12".
 */
import { etiquetaCategoria } from "../etiquetaCategoria";

const MENORES: Record<string, string> = {
  "Sub-12": "Pre Cadetes (Hasta 12 Años)",
  "Sub-14": "Cadetes (Hasta 14 Años)",
  "Sub-12 Promocional": "Pre Cadetes Promocional (Hasta 12 Años)",
  "Sub-14 Promocional": "Cadetes Promocional (Hasta 14 Años)",
  "Sub-10": "Hasta 10 Años",
  "Sub-16": "Hasta 16 Años",
  "Sub-16 Promocional": "Hasta 16 Años Promocional",
  "Sub-18": "Hasta 18 Años",
};

export function etiquetaCategoriaRanking(categoria: string): string {
  if (!categoria) return "";
  if (MENORES[categoria]) return MENORES[categoria];
  return etiquetaCategoria(categoria) || categoria;
}

export function tituloRankingNacional(opciones: {
  tipo: "libres" | "veteranos" | "menores";
  rama: string;
  categoria: string;
}): string {
  const categoria = etiquetaCategoriaRanking(opciones.categoria);
  if (opciones.tipo === "menores") {
    return categoria
      ? `Ranking Nacional ${categoria}`
      : "Ranking Nacional Menores";
  }
  if (opciones.tipo === "libres") {
    const genero =
      opciones.rama === "masculino"
        ? "Caballeros"
        : opciones.rama === "femenino"
          ? "Damas"
          : "";
    return ["Ranking Nacional de Libres", genero, categoria]
      .filter(Boolean)
      .join(" ");
  }
  const genero =
    opciones.rama === "masculino"
      ? "Masculino"
      : opciones.rama === "femenino"
        ? "Femenino"
        : "";
  return ["Ranking Nacional Ladies & Veteranos", genero, categoria]
    .filter(Boolean)
    .join(" ");
}

export function tituloRankingEntidad(rama: string, categoria: string): string {
  const genero = rama === "femenino" ? "Femenino" : "Masculino";
  return ["Ranking", genero, etiquetaCategoriaRanking(categoria)]
    .filter(Boolean)
    .join(" ");
}
