export interface ParejaPuntosRanking {
  id: string;
  puntosTotales: number;
}

/** Top K del ranking (K = cantidad de zonas). */
export function idsCabezasGlobalesPorRanking(
  parejas: ParejaPuntosRanking[],
  cantidadZonas: number,
): Set<string> {
  const k = Math.max(0, cantidadZonas);
  const ordenadas = [...parejas].sort(
    (a, b) => b.puntosTotales - a.puntosTotales,
  );
  return new Set(ordenadas.slice(0, k).map((p) => p.id));
}

export function puntosDeInscripcion(
  mapa: Map<string, number>,
  inscripcionId: string,
): number {
  return mapa.get(inscripcionId) ?? 0;
}

/**
 * Deja como máximo una cabeza de serie por zona.
 * Respeta `preferidaId` si está entre candidatas; si no, gana la de más puntos.
 */
export function elegirCabezaSerieEnZona(
  inscripcionIds: string[],
  cabezasGlobales: Set<string>,
  puntosPorId: Map<string, number>,
  persistidas: Map<string, boolean>,
  preferidaId?: string | null,
): string | null {
  const candidatas = inscripcionIds.filter(
    (id) => cabezasGlobales.has(id) || persistidas.get(id),
  );
  if (candidatas.length === 0) return null;
  if (candidatas.length === 1) return candidatas[0]!;

  if (preferidaId && candidatas.includes(preferidaId)) {
    return preferidaId;
  }

  const conPersistida = candidatas.filter((id) => persistidas.get(id));
  if (conPersistida.length === 1) {
    return conPersistida[0]!;
  }

  return [...candidatas].sort(
    (a, b) => puntosDeInscripcion(puntosPorId, b) - puntosDeInscripcion(puntosPorId, a),
  )[0]!;
}

export function marcarCabezasUnicasEnZonas(
  zonas: { id: string; parejas: { id: string }[] }[],
  cabezasGlobales: Set<string>,
  puntosPorId: Map<string, number>,
  persistidas: Map<string, boolean>,
  preferidasPorZona?: Map<string, string>,
): Map<string, boolean> {
  const resultado = new Map<string, boolean>();
  for (const z of zonas) {
    const elegida = elegirCabezaSerieEnZona(
      z.parejas.map((p) => p.id),
      cabezasGlobales,
      puntosPorId,
      persistidas,
      preferidasPorZona?.get(z.id) ?? null,
    );
    for (const p of z.parejas) {
      resultado.set(p.id, elegida === p.id);
    }
  }
  return resultado;
}
