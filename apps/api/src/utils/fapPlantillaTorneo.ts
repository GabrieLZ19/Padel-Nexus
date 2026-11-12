import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_PAGO } from "../constants/fap";
import {
  getFapBracketForPairCount,
  inferFapPlantillaPairCountFromOrdens,
} from "./fapBracketMatrices";

const PLAYOFF_RONDAS = [
  "PRELIMINARES",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
  "LLAVE",
  "32AVOS",
  "16AVOS",
  "SEMIFINAL",
  "SEMIFINALES",
] as const;

function esRondaPlayoff(ronda: string | null | undefined): boolean {
  const compact = String(ronda || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!compact) return false;
  if (/^ZONA\b/i.test(String(ronda || "").trim())) return false;
  return (PLAYOFF_RONDAS as readonly string[]).some(
    (r) => compact === r || compact.startsWith(r),
  );
}

/**
 * N de plantilla FAP: si ya existe llave, no sube al agregar inscripciones extra en edición.
 */
export async function resolveFapPlantillaPairCount(
  torneoId: string,
): Promise<number> {
  const { data: partidos } = await supabaseAdmin
    .from("partidos")
    .select("orden, ronda")
    .eq("torneo_id", torneoId);

  const playoffOrdens = (partidos || [])
    .filter((p) => esRondaPlayoff(p.ronda))
    .map((p) => Number(p.orden))
    .filter((o) => Number.isFinite(o) && o > 0);

  const inferido = inferFapPlantillaPairCountFromOrdens(playoffOrdens);
  if (inferido != null && getFapBracketForPairCount(inferido)) {
    return inferido;
  }

  const { count } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId)
    .eq("estado_pago", FAP_ESTADOS_PAGO.CONFIRMADO);

  return count ?? 0;
}
