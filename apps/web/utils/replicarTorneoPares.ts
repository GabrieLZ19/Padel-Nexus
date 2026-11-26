import type { RamaPadel } from "@/utils/constants/fapApaRules";

export interface ParNivelRama {
  nivel: string;
  nivelLabel: string;
  rama: RamaPadel | string;
  ramaLabel: string;
}

export function claveParNivelRama(rama: string, nivel: string): string {
  return `${rama}|${nivel}`;
}

export function opcionesParesReplicar(
  niveles: Array<{ value: string; label: string }>,
  ramas: Array<{ value: RamaPadel | string; label: string }>,
  origen: { nivel?: string | null; rama?: string | null },
): ParNivelRama[] {
  const nivelOrigen = String(origen.nivel || "").trim();
  const ramaOrigen = origen.rama || "Masculina";
  const out: ParNivelRama[] = [];
  for (const rama of ramas) {
    for (const nivel of niveles) {
      if (rama.value === ramaOrigen && nivel.value === nivelOrigen) continue;
      out.push({
        rama: rama.value,
        ramaLabel: rama.label,
        nivel: nivel.value,
        nivelLabel: nivel.label,
      });
    }
  }
  return out;
}