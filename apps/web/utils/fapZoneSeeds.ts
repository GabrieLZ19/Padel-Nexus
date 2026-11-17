import { clasificadosPorZona } from "./clasificacionZonas.ts";

export function parseSeedRef(
  ref: string,
): { pos: number; zone: string } | null {
  const m = /^([123])([A-L])$/i.exec(String(ref || "").trim());
  if (!m) return null;
  return { pos: Number(m[1]), zone: m[2].toUpperCase() };
}

export function zoneLetterFromNombreZona(nombreZona: string): string {
  return String(nombreZona || "")
    .replace(/^Zona\s+/i, "")
    .trim()
    .toUpperCase();
}

export function buildZonePairCountsFromZonas(
  zonas: Array<{ nombre: string; parejas: unknown[] }>,
): Map<string, number> {
  const map = new Map<string, number>();
  for (const z of zonas) {
    const letter = zoneLetterFromNombreZona(z.nombre);
    map.set(letter, z.parejas.length);
  }
  return map;
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

/** Oculta equipos en slots que ya no aplican (p. ej. 2B con zona B de 2 parejas). */
export function equipoIdVisibleEnSlotFap(
  ref: string,
  equipoId: string | null | undefined,
  countsByZone: Map<string, number>,
): string | null {
  if (ref.startsWith("W")) return equipoId ?? null;
  if (!isSeedRefValidForZoneComposition(ref, countsByZone)) return null;
  return equipoId ?? null;
}