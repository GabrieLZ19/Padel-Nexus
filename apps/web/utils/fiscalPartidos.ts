import type { Partido } from "@/utils/types";

const ORDEN_RONDAS = [
  "ZONA A",
  "ZONA B",
  "ZONA C",
  "ZONA D",
  "ZONA E",
  "ZONA F",
  "32AVOS",
  "16AVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "SEMIFINAL",
  "FINAL",
];

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
  const r = String(ronda || "").trim();
  const map: Record<string, string> = {
    OCTAVOS: "Octavos",
    CUARTOS: "Cuartos",
    SEMIS: "Semifinales",
    SEMIFINAL: "Semifinales",
    FINAL: "Final",
    "32AVOS": "32avos",
    "16AVOS": "16avos",
  };
  const upper = r.toUpperCase();
  if (map[upper]) return map[upper];
  if (/^zona/i.test(r)) return r.replace(/^zona/i, "Zona");
  return r || "Ronda";
}

function pesoRonda(ronda?: string | null): number {
  const upper = String(ronda || "").trim().toUpperCase();
  const idx = ORDEN_RONDAS.indexOf(upper);
  if (idx >= 0) return idx;
  const zona = upper.match(/^ZONA\s+([A-Z])/);
  if (zona) return zona[1].charCodeAt(0) - 65;
  return 80;
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
