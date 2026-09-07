/** Tipos del motor de llaves FAP (posición de zona ≠ seed ≠ slot ≠ matchNo). */

export type FapSideRef = string; // "1A" | "W50"

export interface FapBracketMatch {
  matchNo: number;
  a: FapSideRef;
  b: FapSideRef;
  winnerTo: number | null;
}

export interface QualifiedPair {
  pairId: string;
  zone: string; // "A"
  qualificationPosition: 1 | 2 | 3;
  rankingScore?: number;
}

export function zonePosKey(zone: string, position: number): string {
  const letter = zone.replace(/^Zona\s+/i, "").trim().toUpperCase();
  return `${position}${letter}`;
}

export function parseZonePos(
  ref: string,
): { position: 1 | 2 | 3; zone: string } | null {
  const m = /^([123])([A-L])$/i.exec(ref.trim());
  if (!m) return null;
  return {
    position: Number(m[1]) as 1 | 2 | 3,
    zone: m[2].toUpperCase(),
  };
}

export function roundNameForMatchNo(matchNo: number): string {
  if (matchNo === 64) return "FINAL";
  if (matchNo === 61 || matchNo === 62) return "SEMIS";
  if (matchNo >= 57 && matchNo <= 60) return "CUARTOS";
  if (matchNo >= 49 && matchNo <= 56) return "OCTAVOS";
  if (matchNo >= 33 && matchNo <= 48) return "PRELIMINARES";
  return "LLAVE";
}
