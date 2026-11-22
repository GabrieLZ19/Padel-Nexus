import type { FapBracketMatch } from "./fapBracketTypes";
import { roundNameForMatchNo } from "./fapBracketTypes";

function claveRondaLlave(ronda?: string | null): string {
  const code = String(ronda || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (code === "PRELIMINARES" || code === "PRELIMINAR" || code === "16AVOS") {
    return "16AVOS";
  }
  if (code === "SEMIS" || code === "SEMIFINAL" || code === "SEMIFINALES") {
    return "SEMIS";
  }
  return code;
}

function esRondaDeZona(ronda?: string | null): boolean {
  return /^ZONA\s+/i.test(String(ronda || "").trim());
}

function vincularPartidosAMatriz(
  matchNos: number[],
  partidos: Array<{
    id: string;
    ronda?: string | null;
    orden?: number | null;
  }>,
): Map<number, string> {
  const slotsPorRonda = new Map<string, number[]>();
  for (const matchNo of matchNos) {
    const key = claveRondaLlave(roundNameForMatchNo(matchNo));
    const slots = slotsPorRonda.get(key) ?? [];
    slots.push(matchNo);
    slotsPorRonda.set(key, slots);
  }
  for (const slots of slotsPorRonda.values()) slots.sort((a, b) => a - b);

  const partidosPorRonda = new Map<string, typeof partidos>();
  for (const partido of partidos) {
    if (esRondaDeZona(partido.ronda)) continue;
    const key = claveRondaLlave(partido.ronda);
    const lista = partidosPorRonda.get(key) ?? [];
    lista.push(partido);
    partidosPorRonda.set(key, lista);
  }

  const vinculo = new Map<number, string>();
  for (const [key, slots] of slotsPorRonda) {
    const deLaRonda = [...(partidosPorRonda.get(key) ?? [])].sort(
      (a, b) => (a.orden ?? 0) - (b.orden ?? 0),
    );
    const ocupados = new Set<number>();
    const sinCruce: typeof deLaRonda = [];
    for (const partido of deLaRonda) {
      const orden = partido.orden ?? -1;
      if (slots.includes(orden) && !ocupados.has(orden)) {
        vinculo.set(orden, partido.id);
        ocupados.add(orden);
      } else {
        sinCruce.push(partido);
      }
    }
    const libres = slots.filter((matchNo) => !ocupados.has(matchNo));
    sinCruce.forEach((partido, index) => {
      const matchNo = libres[index];
      if (matchNo != null) vinculo.set(matchNo, partido.id);
    });
  }
  return vinculo;
}

/** matchNo de matriz FAP para un partido de playoff (orden puede no coincidir). */
export function resolverMatchNoFap(
  partidoId: string,
  partidoOrden: number,
  matrix: readonly FapBracketMatch[],
  playoffPartidos: Array<{
    id: string;
    ronda?: string | null;
    orden?: number | null;
  }>,
): number {
  const matchNos = matrix.map((m) => m.matchNo);
  if (matchNos.includes(partidoOrden)) return partidoOrden;
  const vinculo = vincularPartidosAMatriz(matchNos, playoffPartidos);
  for (const [matchNo, id] of vinculo) {
    if (id === partidoId) return matchNo;
  }
  return partidoOrden;
}