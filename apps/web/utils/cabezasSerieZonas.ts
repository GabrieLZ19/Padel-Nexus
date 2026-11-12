import type { ParejaDrag, ZonaDrag } from "@/components/torneos/DragDropPairing";

export function zonaConMultiplesCabezas(
  zonas: ZonaDrag[],
): { zona: ZonaDrag; candidatos: ParejaDrag[] } | null {
  for (const z of zonas) {
    const candidatos = z.parejas.filter((p) => p.cabezaDeSerie);
    if (candidatos.length > 1) {
      return { zona: z, candidatos };
    }
  }
  return null;
}

export function etiquetaParejaCorta(p: ParejaDrag): string {
  const j1 = (p.jugador1_nombre || "Jugador 1").trim();
  const j2 = (p.jugador2_nombre || "").trim();
  return j2 && j2 !== "-" ? `${j1} / ${j2}` : j1;
}

/** Deja una sola cabeza de serie en la zona; por defecto la de más puntos de ranking. */
export function resolverCabezasEnZona(
  zona: ZonaDrag,
  cabezaElegidaId: string,
): ZonaDrag {
  const idsCandidatos = new Set(
    zona.parejas.filter((p) => p.cabezaDeSerie).map((p) => p.id),
  );
  return {
    ...zona,
    parejas: zona.parejas.map((p) => {
      if (!idsCandidatos.has(p.id)) return p;
      return { ...p, cabezaDeSerie: p.id === cabezaElegidaId };
    }),
  };
}

export function cabezaPorMejorRanking(candidatos: ParejaDrag[]): string {
  const ordenadas = [...candidatos].sort(
    (a, b) => (b.puntos_ranking ?? 0) - (a.puntos_ranking ?? 0),
  );
  return ordenadas[0]?.id ?? candidatos[0]!.id;
}
