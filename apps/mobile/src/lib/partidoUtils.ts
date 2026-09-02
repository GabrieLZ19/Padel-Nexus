import type { PartidoTorneo } from "@/src/types/competencia.types";

export type VistaDenominacion = "nacional" | "provincial" | "club";

export function setsGanados(
  partido: PartidoTorneo,
  lado: "a" | "b",
): number {
  const pairs: Array<[number | null | undefined, number | null | undefined]> = [
    [partido.set1_a, partido.set1_b],
    [partido.set2_a, partido.set2_b],
    [partido.set3_a, partido.set3_b],
  ];

  let wins = 0;
  for (const [a, b] of pairs) {
    if (a == null || b == null) continue;
    if (lado === "a" && a > b) wins += 1;
    if (lado === "b" && b > a) wins += 1;
  }
  return wins;
}

export function etiquetaEquipo(
  partido: PartidoTorneo,
  lado: "a" | "b",
  vista: VistaDenominacion = "nacional",
): { titulo: string; detalle: string; seed?: string | null } {
  const j1 = lado === "a" ? partido.equipo_a_j1 : partido.equipo_b_j1;
  const j2 = lado === "a" ? partido.equipo_a_j2 : partido.equipo_b_j2;
  const club = lado === "a" ? partido.equipo_a_club : partido.equipo_b_club;
  const provincia =
    lado === "a" ? partido.equipo_a_provincia : partido.equipo_b_provincia;
  const denominacion =
    lado === "a" ? partido.equipo_a_denominacion : partido.equipo_b_denominacion;
  const seed =
    lado === "a"
      ? partido.equipo_a_letra_prioridad
      : partido.equipo_b_letra_prioridad;

  const jugadores = [j1, j2].filter(Boolean).join(" / ");

  if (vista === "nacional") {
    return {
      titulo: (denominacion || provincia || "Por definir").toUpperCase(),
      detalle: jugadores || "Tocá para ver los jugadores",
      seed,
    };
  }

  if (vista === "provincial") {
    return {
      titulo: (provincia || denominacion || "Por definir").toUpperCase(),
      detalle: jugadores || "Tocá para ver los jugadores",
      seed,
    };
  }

  return {
    titulo: jugadores || "Por definir",
    detalle: club || provincia || "",
    seed,
  };
}

export function partidoTieneResultado(partido: PartidoTorneo): boolean {
  return Boolean(partido.ganador) || Boolean(partido.estado_partido === "Finalizado");
}

export function formatScoreLine(partido: PartidoTorneo): string {
  const parts: string[] = [];
  if (partido.set1_a != null && partido.set1_b != null) {
    parts.push(`${partido.set1_a}-${partido.set1_b}`);
  }
  if (partido.set2_a != null && partido.set2_b != null) {
    parts.push(`${partido.set2_a}-${partido.set2_b}`);
  }
  if (partido.set3_a != null && partido.set3_b != null) {
    parts.push(`${partido.set3_a}-${partido.set3_b}`);
  }
  return parts.join(" · ") || "Sin resultado";
}

export interface SetPartidoFila {
  label: string;
  a: number | null;
  b: number | null;
}

export function listarSetsPartido(partido: PartidoTorneo): SetPartidoFila[] {
  return [
    {
      label: "S1",
      a: partido.set1_a ?? null,
      b: partido.set1_b ?? null,
    },
    {
      label: "S2",
      a: partido.set2_a ?? null,
      b: partido.set2_b ?? null,
    },
    {
      label: "S3",
      a: partido.set3_a ?? null,
      b: partido.set3_b ?? null,
    },
  ];
}

export function tieneAlgunSet(partido: PartidoTorneo): boolean {
  return listarSetsPartido(partido).some(
    (set) => set.a != null || set.b != null,
  );
}

export function ganoSet(
  set: SetPartidoFila,
  lado: "a" | "b",
): boolean {
  if (set.a == null || set.b == null) return false;
  return lado === "a" ? set.a > set.b : set.b > set.a;
}

export function agruparPartidosPorRonda(
  partidos: PartidoTorneo[],
): Record<string, PartidoTorneo[]> {
  const groups: Record<string, PartidoTorneo[]> = {};
  for (const partido of partidos) {
    const key = partido.ronda || "Sin ronda";
    if (!groups[key]) groups[key] = [];
    groups[key].push(partido);
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.orden - b.orden);
  }
  return groups;
}

const ORDEN_RONDAS = [
  "zonas",
  "grupos",
  "32avos",
  "dieciseisavos",
  "16avos",
  "octavos",
  "cuartos",
  "semifinal",
  "semis",
  "final",
];

export const RONDAS_CUADRO = [
  "32AVOS",
  "16AVOS",
  "DIECISEISAVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "SEMIFINAL",
  "FINAL",
] as const;

function normalizarRonda(ronda: string): string {
  return (ronda || "").toUpperCase().trim();
}

export function esRondaCuadro(ronda: string): boolean {
  const r = normalizarRonda(ronda);
  if (RONDAS_CUADRO.some((playoff) => r === playoff)) return true;
  if (r.includes("32AV")) return true;
  if (r.includes("16AV") || r.includes("DIECISEIS")) return true;
  if (r.includes("OCTAV")) return true;
  if (r.includes("CUART")) return true;
  if (r.includes("SEMI")) return true;
  return r === "FINAL";
}

export function esRondaZona(ronda: string): boolean {
  const r = normalizarRonda(ronda);
  if (!r || esRondaCuadro(r)) return false;
  return r.startsWith("ZONA") || r.includes("GRUPO");
}

export function separarPartidosPorFase(partidos: PartidoTorneo[]): {
  cuadro: PartidoTorneo[];
  zonas: PartidoTorneo[];
} {
  const cuadro: PartidoTorneo[] = [];
  const zonas: PartidoTorneo[] = [];

  for (const partido of partidos) {
    if (esRondaCuadro(partido.ronda)) {
      cuadro.push(partido);
    } else if (esRondaZona(partido.ronda)) {
      zonas.push(partido);
    }
  }

  return { cuadro, zonas };
}

export function ordenarRondasCuadro(rondas: string[]): string[] {
  return ordenarRondas(rondas.filter(esRondaCuadro));
}

export function ordenarRondas(rondas: string[]): string[] {
  return [...rondas].sort((a, b) => {
    const ia = ORDEN_RONDAS.findIndex((r) =>
      a.toLowerCase().includes(r),
    );
    const ib = ORDEN_RONDAS.findIndex((r) =>
      b.toLowerCase().includes(r),
    );
    const sa = ia === -1 ? 99 : ia;
    const sb = ib === -1 ? 99 : ib;
    if (sa !== sb) return sa - sb;
    return a.localeCompare(b);
  });
}
