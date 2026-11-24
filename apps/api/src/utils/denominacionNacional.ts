/**
 * Etiqueta de representación en torneos nacionales: "NEUQUÉN A", "BUENOS AIRES C".
 * Provincia = ASOCIACIÓN de la planilla, provincia canónica en residencia o inferida desde localidad.
 * Letra = LETRA de la planilla (letra_prioridad de la inscripción).
 * Provincia completa en mayúsculas + letra (sin abreviaturas).
 */

import { provinciaEfectivaDesdePerfil } from "./provinciaPerfil";

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

export function aplicaDenominacionNacional(
  alcanceTorneo?: string | null,
): boolean {
  const alcance = String(alcanceTorneo || "").trim().toLowerCase();
  if (!alcance || alcance === "local") return false;
  return /nacional/i.test(alcance);
}

export function enrichInscripcionDenominacion(
  ins: {
    letra_prioridad?: string | null;
    usuario_id?: string | null;
    usuario2_id?: string | null;
    perfiles?: {
      lugar_residencia?: string | null;
      clubes?: { provincia?: string | null; nombre?: string | null } | null;
    } | null;
    perfiles_jugador2?: {
      lugar_residencia?: string | null;
      clubes?: { provincia?: string | null; nombre?: string | null } | null;
    } | null;
  },
  alcanceTorneo?: string | null,
) {
  const provinciaJ1 = provinciaEfectivaDesdePerfil(
    ins.perfiles?.lugar_residencia,
    ins.perfiles?.clubes?.provincia,
  );
  const provinciaJ2 = provinciaEfectivaDesdePerfil(
    ins.perfiles_jugador2?.lugar_residencia,
    ins.perfiles_jugador2?.clubes?.provincia,
  );
  const provincia = provinciaJ1 || provinciaJ2 || null;
  const letra = ins.letra_prioridad ?? null;
  const usarDenominacion = aplicaDenominacionNacional(alcanceTorneo);
  return {
    provincia,
    letra_prioridad: letra,
    denominacion_nacional: usarDenominacion
      ? buildDenominacionNacional(provincia, letra)
      : null,
    usuario_id: ins.usuario_id ?? null,
    usuario2_id: ins.usuario2_id ?? null,
  };
}
