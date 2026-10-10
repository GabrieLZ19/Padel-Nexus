import { cleanJugadorNombre, formatNombrePareja } from "./nombrePareja";

/** Rival que todavía no está. No es un bye. */
export const POR_DEFINIR = "Por definir";

/** Hueco de un bye real: el otro lado avanza sin partido. */
export const LIBRE = "Libre";

const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e"]);

export function esAlcanceNacional(alcance?: string | null): boolean {
  return /nacional/i.test(String(alcance || "").trim());
}

/** «CÓRDOBA» → «Córdoba», «BUENOS AIRES» → «Buenos Aires». */
export function tituloEs(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => {
      const lower = word.toLocaleLowerCase("es-AR");
      if (index > 0 && PARTICULAS.has(lower)) return lower;
      return lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
    })
    .join(" ");
}

/** «FUENTES, Gerónimo» → «Fuentes». */
export function apellidoVisible(full?: string | null): string {
  const cleaned = cleanJugadorNombre(full);
  if (!cleaned) return "";
  const comma = cleaned.indexOf(",");
  const apellido = (
    comma === -1 ? cleaned.split(/\s+/)[0] : cleaned.slice(0, comma)
  ).trim();
  if (!apellido) return "";
  return tituloEs(apellido);
}

/** «Córdoba C» a partir de provincia + letra, o de una denominación ya armada. */
export function denominacionVisible(opts: {
  provincia?: string | null;
  letra?: string | null;
  denominacion?: string | null;
}): string {
  const prov = String(opts.provincia || "").trim();
  const letra = String(opts.letra || "").trim();
  const provinciaUtil =
    prov && !/^a completar/i.test(prov) ? prov : "";
  if (provinciaUtil && letra) {
    return `${tituloEs(provinciaUtil)} ${letra.toLocaleUpperCase("es-AR").charAt(0)}`;
  }

  const directa = String(opts.denominacion || "").trim();
  if (!directa || directa.toLowerCase() === "sin denominación") {
    return provinciaUtil ? tituloEs(provinciaUtil) : "";
  }

  const parts = directa.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1].length === 1) {
    const letter = parts[parts.length - 1].toLocaleUpperCase("es-AR");
    return `${tituloEs(parts.slice(0, -1).join(" "))} ${letter}`;
  }
  return tituloEs(directa);
}

/**
 * En un nacional: «Córdoba C · Fuentes / Tomasini».
 * En otro alcance se mantienen los nombres completos.
 * Cadena vacía si no hay pareja: el caller usa POR_DEFINIR o LIBRE.
 */
export function etiquetaParejaVisible(opts: {
  j1?: string | null;
  j2?: string | null;
  provincia?: string | null;
  letra?: string | null;
  denominacion?: string | null;
  nacional?: boolean;
}): string {
  if (!opts.nacional) return formatNombrePareja(opts.j1, opts.j2);

  const nombres = [apellidoVisible(opts.j1), apellidoVisible(opts.j2)]
    .filter(Boolean)
    .join(" / ");
  const denom = denominacionVisible(opts);
  if (denom && nombres) return `${denom} · ${nombres}`;
  return nombres || denom;
}
