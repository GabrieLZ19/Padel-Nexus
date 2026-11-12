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

/** Top K del ranking dentro del torneo (K = cantidad de zonas). */
export function idsCabezasGlobalesDesdeZonas(zonas: ZonaDrag[]): Set<string> {
  const porId = new Map<string, number>();
  for (const z of zonas) {
    for (const p of z.parejas) {
      if (!porId.has(p.id)) {
        porId.set(p.id, p.puntos_ranking ?? 0);
      }
    }
  }
  const k = Math.max(0, zonas.length);
  const ordenadas = [...porId.entries()].sort((a, b) => b[1] - a[1]);
  return new Set(ordenadas.slice(0, k).map(([id]) => id));
}

/** Con validación de ranking activa: dos o más del top K en la misma zona. */
export function zonaConMultiplesCabezasRanking(
  zonas: ZonaDrag[],
  cabezasGlobales: Set<string>,
): { zona: ZonaDrag; candidatos: ParejaDrag[] } | null {
  for (const z of zonas) {
    const candidatos = z.parejas.filter((p) => cabezasGlobales.has(p.id));
    if (candidatos.length > 1) {
      return { zona: z, candidatos };
    }
  }
  return null;
}
