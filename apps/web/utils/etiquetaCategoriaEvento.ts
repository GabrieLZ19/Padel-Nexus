import {
  etiquetaCategoria,
  etiquetaNivelYCategoria,
} from "./etiquetaCategoria.ts";

function esFamiliaCategoriaFap(categoria?: string | null): boolean {
  const c = String(categoria || "")
    .trim()
    .toLowerCase();
  return c === "libres" || c === "libre" || c === "menores";
}

function etiquetaRamaTorneoPublico(
  rama?: string | null,
  categoria?: string | null,
): string {
  const r = String(rama || "").toLowerCase();
  const fam = String(categoria || "")
    .trim()
    .toLowerCase();
  if (r.startsWith("fem") || r.includes("dama")) return "Damas";
  if (fam === "libres" || fam === "libre") {
    if (r.startsWith("mas") || r.includes("cab")) return "Libre";
  }
  if (r.startsWith("mas") || r.includes("cab")) return "Caballeros";
  if (r.startsWith("mix")) return "Mixto";
  return String(rama || "").trim();
}

/** PUB-33: chip público nivel + rama/categoría (tarjetas y detalle). */
export function etiquetaChipCategoriaTorneoPublico(torneo: {
  nivel?: string | null;
  categoria?: string | null;
  rama?: string | null;
}): string {
  const nivelFmt = etiquetaCategoria(torneo.nivel);
  if (nivelFmt && esFamiliaCategoriaFap(torneo.categoria)) {
    const ramaLbl = etiquetaRamaTorneoPublico(torneo.rama, torneo.categoria);
    if (ramaLbl) return `${nivelFmt} ${ramaLbl}`;
  }
  return (
    etiquetaNivelYCategoria(torneo.nivel, torneo.categoria) || nivelFmt || ""
  );
}