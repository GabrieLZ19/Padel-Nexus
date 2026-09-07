/** Placement FAP: clasificados por posición de zona → slots de matriz oficial. */

import type { FapBracketMatch, QualifiedPair } from "./fapBracketTypes";
import {
  getFapBracketForPairCount,
  listLeafSeeds,
} from "./fapBracketMatrices";
import { roundNameForMatchNo, zonePosKey } from "./fapBracketTypes";

export interface FapPlayoffPartidoDraft {
  matchNo: number;
  ronda: string;
  orden: number;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  estado_partido: string;
  winnerTo: number | null;
}

export function buildQualifiedMap(
  pairs: QualifiedPair[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of pairs) {
    map.set(zonePosKey(p.zone, p.qualificationPosition), p.pairId);
  }
  return map;
}

function resolveSide(
  ref: string,
  qualified: Map<string, string>,
): string | null {
  if (ref.startsWith("W")) return null; // TBD until previous match finishes
  return qualified.get(ref.toUpperCase()) ?? null;
}

/**
 * Genera el esqueleto completo de llave FAP (todos los partidos de la matriz).
 * Las hojas con clasificado conocido se rellenan; los W* quedan TBD.
 */
export function buildFapPlayoffDrafts(
  pairCount: number,
  qualified: Map<string, string>,
): FapPlayoffPartidoDraft[] {
  const matrix = getFapBracketForPairCount(pairCount);
  if (!matrix) {
    throw new Error(
      `No hay matriz FAP para ${pairCount} parejas (soportado 6–36).`,
    );
  }

  const required = listLeafSeeds(matrix);
  const missing = required.filter((s) => !qualified.has(s));
  // Al generar esqueleto temprano puede faltar clasificados; se permiten nulls.
  void missing;

  return matrix.map((m: FapBracketMatch) => {
    const a = resolveSide(m.a, qualified);
    const b = resolveSide(m.b, qualified);
    const bothReady = Boolean(a && b);
    return {
      matchNo: m.matchNo,
      ronda: roundNameForMatchNo(m.matchNo),
      orden: m.matchNo,
      equipo_a_id: a,
      equipo_b_id: b,
      estado_partido: bothReady ? "Programado" : "Programado",
      winnerTo: m.winnerTo,
    };
  });
}

/**
 * Rellena solo partidos de primera aparición (hojas) cuando ya hay clasificados.
 * Usado al sincronizar fin de zonas.
 */
export function fillLeafSidesFromQualified(
  matrix: readonly FapBracketMatch[],
  qualified: Map<string, string>,
): Array<{ matchNo: number; equipo_a_id: string | null; equipo_b_id: string | null }> {
  return matrix.map((m) => ({
    matchNo: m.matchNo,
    equipo_a_id: resolveSide(m.a, qualified),
    equipo_b_id: resolveSide(m.b, qualified),
  }));
}

export function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
