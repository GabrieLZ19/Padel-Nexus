import type { Partido } from "@/utils/types";
import { etiquetaRondaLlave, ordenRondaLlave } from "@/utils/rondasLlave";

/** Placeholder que deja la generación de llaves (`Cancha 1`), no una sede real. */
export function esCanchaPlaceholder(cancha?: string | null): boolean {
  const v = String(cancha || "").trim();
  if (!v) return true;
  return /^cancha\s+\d+$/i.test(v);
}

export function canchaAsignadaReal(cancha?: string | null): string | null {
  const v = String(cancha || "").trim();
  if (!v || esCanchaPlaceholder(v)) return null;
  return v;
}

export function etiquetaCanchaAsignada(cancha?: string | null): string {
  return canchaAsignadaReal(cancha) || "Pendiente";
}

export function etiquetaCruce(j1?: string | null, j2?: string | null): string {
  const nombres = [j1, j2].filter((n) => n && n !== "-" && n !== "Libre");
  return nombres.length > 0 ? nombres.join(" / ") : "";
}

export function partidoEstaDefinido(p: Partido): boolean {
  const a = etiquetaCruce(p.equipo_a_j1, p.equipo_a_j2);
  const b = etiquetaCruce(p.equipo_b_j1, p.equipo_b_j2);
  return Boolean(a && b);
}

export function labelRonda(ronda?: string | null): string {
  return etiquetaRondaLlave(ronda);
}

function pesoRonda(ronda?: string | null): number {
  return ordenRondaLlave(ronda);
}

export function partidosDefinidosOrdenados(partidos: Partido[]): Partido[] {
  return [...partidos]
    .filter(partidoEstaDefinido)
    .sort((a, b) => {
      const pr = pesoRonda(a.ronda) - pesoRonda(b.ronda);
      if (pr !== 0) return pr;
      return (a.orden || 0) - (b.orden || 0);
    });
}

export function agruparPartidosPorRonda(partidos: Partido[]): { ronda: string; label: string; partidos: Partido[] }[] {
  const ordenados = partidosDefinidosOrdenados(partidos);
  const grupos: { ronda: string; label: string; partidos: Partido[] }[] = [];
  for (const p of ordenados) {
    const ronda = p.ronda || "Ronda";
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.ronda === ronda) {
      ultimo.partidos.push(p);
    } else {
      grupos.push({ ronda, label: labelRonda(ronda), partidos: [p] });
    }
  }
  return grupos;
}
