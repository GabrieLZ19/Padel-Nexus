/**
 * Etiqueta de representación en torneos nacionales: "NEUQUÉN A", "BUENOS AIRES C".
 * Espejo del helper de API para UI/PDF.
 * Provincia = ASOCIACIÓN de planilla (en perfil.lugar_residencia) o, si no vino, la residencia ya cargada.
 * Letra = LETRA de la planilla (letra_prioridad).
 */

/** Abreviaturas legacy → nombre completo (por si llega una denominación vieja). */
const EXPANDIR_ABREVIATURAS: Record<string, string> = {
  "bs. as.": "Buenos Aires",
  "bs as": "Buenos Aires",
  "bs.as.": "Buenos Aires",
  caba: "Ciudad Autónoma de Buenos Aires",
};

function esProvinciaPlaceholder(provincia?: string | null): boolean {
  const v = String(provincia || "")
    .trim()
    .toLowerCase();
  return !v || v === "a completar" || v.startsWith("a completar ");
}

function expandirSiAbreviada(provincia: string): string {
  const key = provincia.trim().toLowerCase().replace(/\s+/g, " ");
  return EXPANDIR_ABREVIATURAS[key] || provincia.trim();
}

/** Provincia completa en mayúsculas (sin abreviaturas). */
export function formatProvinciaDenominacion(
  provincia?: string | null,
): string | null {
  const prov = String(provincia || "").trim();
  if (!prov || esProvinciaPlaceholder(prov)) return null;
  return expandirSiAbreviada(prov).toLocaleUpperCase("es-AR");
}

export function buildDenominacionNacional(
  provincia?: string | null,
  letra?: string | null,
): string | null {
  const prov = formatProvinciaDenominacion(provincia);
  const letter = (letra || "").trim().toUpperCase();
  if (!prov || !letter) return null;
  return `${prov} ${letter}`;
}

function normalizarDenominacionDirecta(raw: string): string {
  const trimmed = raw.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  // Solo "PROVINCIA… LETRA" si el último token es una sola letra (A–Z).
  if (parts.length >= 2 && parts[parts.length - 1].length === 1) {
    const letter = parts[parts.length - 1].toUpperCase();
    const prov = formatProvinciaDenominacion(parts.slice(0, -1).join(" "));
    if (prov) return `${prov} ${letter}`;
  }
  return trimmed.toLocaleUpperCase("es-AR");
}

/** Texto para columnas "Institución / Club": provincia + letra. */
export function etiquetaInstitucion(opts: {
  denominacion_nacional?: string | null;
  provincia?: string | null;
  letra_prioridad?: string | null;
}): string {
  // Preferir armar desde provincia + letra (nombre completo, mayúsculas).
  const built = buildDenominacionNacional(
    opts.provincia,
    opts.letra_prioridad,
  );
  if (built) return built;

  const directa = String(opts.denominacion_nacional || "").trim();
  if (directa) return normalizarDenominacionDirecta(directa);

  const soloProv = formatProvinciaDenominacion(opts.provincia);
  if (soloProv) return soloProv;

  return "Sin denominación";
}
