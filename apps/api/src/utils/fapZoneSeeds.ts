import { clasificadosPorZona } from "./clasificacionZonas";

export function parseSeedRef(
  ref: string,
): { pos: number; zone: string } | null {
  const m = /^([123])([A-L])$/i.exec(String(ref || "").trim());
  if (!m) return null;
  return { pos: Number(m[1]), zone: m[2].toUpperCase() };
}

export function zoneLetterFromNombreGrupo(nombreGrupo: string): string {
  return String(nombreGrupo || "")
    .replace(/^Zona\s+/i, "")
    .trim()
    .toUpperCase();
}

export function buildZonePairCountsByLetter(
  grupos: Array<{
    nombre_grupo: string;
    grupo_parejas?: { inscripcion_id: string }[] | null;
  }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const g of grupos) {
    const letter = zoneLetterFromNombreGrupo(g.nombre_grupo);
    map.set(letter, g.grupo_parejas?.length ?? 0);
  }
  return map;
}

/** Semillas hoja FAP que aplican con la cantidad actual de parejas por zona. */
export function buildValidLeafSeedRefs(
  countsByZone: Map<string, number>,
): Set<string> {
  const seeds = new Set<string>();
  for (const [zone, count] of countsByZone) {
    const cupo = clasificadosPorZona(count);
    for (let pos = 1; pos <= cupo; pos++) {
      seeds.add(`${pos}${zone}`);
    }
  }
  return seeds;
}

export function isSeedRefValidForZoneComposition(
  ref: string,
  countsByZone: Map<string, number>,
): boolean {
  const parsed = parseSeedRef(ref);
  if (!parsed) return true;
  const count = countsByZone.get(parsed.zone) ?? 0;
  const maxPos = clasificadosPorZona(count);
  return parsed.pos >= 1 && parsed.pos <= maxPos;
}
