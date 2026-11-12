import { supabaseAdmin } from "../config/supabase";
import { normalizarProvincia } from "../constants/rankings";

const PROVINCIAS_ARG = [
  "Buenos Aires",
  "CABA",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

/** Forma canónica (acentos y capitalización) para las 24 provincias argentinas. */
export function provinciaCanonicaArgentina(
  valor?: string | null,
): string | null {
  const raw = String(valor || "").trim();
  if (!raw) return null;
  const norm = normalizarProvincia(raw);
  const hit = PROVINCIAS_ARG.find(
    (p) => normalizarProvincia(p) === norm,
  );
  return hit ?? null;
}

export async function mapaSiglaAsociacionProvincia(): Promise<
  Map<string, string>
> {
  const { data } = await supabaseAdmin
    .from("asociaciones")
    .select("sigla, provincia")
    .not("sigla", "is", null);

  const map = new Map<string, string>();
  for (const row of data || []) {
    const sigla = String(row.sigla || "").trim().toUpperCase();
    const provincia = String(row.provincia || "").trim();
    if (sigla && provincia) map.set(sigla, provincia);
  }
  return map;
}

/** Evita mostrar siglas (ej. APN) cuando el jugador tiene residencia abreviada. */
export function provinciaParaRanking(
  lugarResidencia: string | null | undefined,
  siglas: Map<string, string>,
  clubProvincia?: string | null,
): string {
  const lr = (lugarResidencia || "").trim();
  if (lr) {
    const porSigla = siglas.get(lr.toUpperCase());
    if (porSigla) return porSigla;
    const canon = provinciaCanonicaArgentina(lr);
    if (canon) return canon;
    if (lr.length > 5 || /\s/.test(lr)) return lr;
  }
  const club = (clubProvincia || "").trim();
  if (club) {
    const canon = provinciaCanonicaArgentina(club);
    return canon || club;
  }
  return "";
}
