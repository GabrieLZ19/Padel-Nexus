/** Placement FAP: clasificados por posición de zona → slots de matriz oficial. */

import type { FapBracketMatch, QualifiedPair } from "./fapBracketTypes";
import {
  getFapBracketForPairCount,
  listLeafSeeds,
} from "./fapBracketMatrices";
import { roundNameForMatchNo, zonePosKey } from "./fapBracketTypes";
import {
  equipoEnSlotDesdeClasificado,
  isSeedRefValidForZoneComposition,
  listSemillasPendientesFap,
} from "./fapZoneSeeds";

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

export type PartidoLlavePorOrden = {
  orden: number;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
};

export type ResumenProyeccionLlaveFap = {
  actualizaciones: Array<{
    matchNo: number;
    equipo_a_id: string | null;
    equipo_b_id: string | null;
  }>;
  semillas_invalidadas: string[];
  semillas_actualizadas: string[];
  semillas_pendientes: string[];
};

/**
 * TOR-24: recalcula hojas de llave según composición actual de zonas y clasificados.
 * No destructivo: invalida plazas que ya no aplican (ej. 2B si la zona B queda en 2 parejas).
 */
export function proyectarSincronizacionHojasFap(
  matrix: readonly FapBracketMatch[],
  countsByZone: Map<string, number>,
  qualifiedMap: Map<string, string>,
  partidos: PartidoLlavePorOrden[],
): ResumenProyeccionLlaveFap {
  const byOrden = new Map(partidos.map((p) => [p.orden, p]));
  const fills = fillLeafSidesFromQualified(matrix, qualifiedMap);
  const requiredSeeds = listLeafSeeds(matrix);
  const semillas_pendientes = listSemillasPendientesFap(
    requiredSeeds,
    qualifiedMap,
    countsByZone,
  );
  const semillas_invalidadas: string[] = [];
  const semillas_actualizadas: string[] = [];
  const actualizaciones: ResumenProyeccionLlaveFap["actualizaciones"] = [];

  for (const fill of fills) {
    const partido = byOrden.get(fill.matchNo);
    if (!partido) continue;
    const matrixMatch = matrix.find((m) => m.matchNo === fill.matchNo);
    if (!matrixMatch) continue;

    const prevA = partido.equipo_a_id;
    const prevB = partido.equipo_b_id;

    const equipo_a_id = equipoEnSlotDesdeClasificado(
      matrixMatch.a,
      fill.equipo_a_id,
      countsByZone,
      partido.equipo_a_id,
    );
    const equipo_b_id = equipoEnSlotDesdeClasificado(
      matrixMatch.b,
      fill.equipo_b_id,
      countsByZone,
      partido.equipo_b_id,
    );

    if (!matrixMatch.a.startsWith("W")) {
      if (prevA && equipo_a_id === null) {
        semillas_invalidadas.push(matrixMatch.a);
      } else if (
        prevA !== equipo_a_id &&
        equipo_a_id &&
        isSeedRefValidForZoneComposition(matrixMatch.a, countsByZone)
      ) {
        semillas_actualizadas.push(matrixMatch.a);
      }
    }
    if (!matrixMatch.b.startsWith("W")) {
      if (prevB && equipo_b_id === null) {
        semillas_invalidadas.push(matrixMatch.b);
      } else if (
        prevB !== equipo_b_id &&
        equipo_b_id &&
        isSeedRefValidForZoneComposition(matrixMatch.b, countsByZone)
      ) {
        semillas_actualizadas.push(matrixMatch.b);
      }
    }

    if (equipo_a_id === prevA && equipo_b_id === prevB) continue;

    actualizaciones.push({
      matchNo: fill.matchNo,
      equipo_a_id,
      equipo_b_id,
    });
  }

  return {
    actualizaciones,
    semillas_invalidadas: [...new Set(semillas_invalidadas)],
    semillas_actualizadas: [...new Set(semillas_actualizadas)],
    semillas_pendientes,
  };
}
