/**
 * Presentación de la llave: nombres completos y numeración seguida de las zonas.
 * El `orden` guardado sigue siendo el matchNo de la matriz FAP.
 */

const ETIQUETAS: Record<string, string> = {
  "32AVOS": "Treintaidosavos de final",
  "16AVOS": "Dieciseisavos de final",
  PRELIMINARES: "Dieciseisavos de final",
  PRELIMINAR: "Dieciseisavos de final",
  OCTAVOS: "Octavos de final",
  CUARTOS: "Cuartos de final",
  SEMIS: "Semifinales",
  SEMIFINAL: "Semifinales",
  SEMIFINALES: "Semifinales",
  FINAL: "Final",
};

const ORDEN: Record<string, number> = {
  "32AVOS": 100,
  "16AVOS": 110,
  PRELIMINARES: 110,
  PRELIMINAR: 110,
  OCTAVOS: 120,
  CUARTOS: 130,
  SEMIS: 140,
  SEMIFINAL: 140,
  SEMIFINALES: 140,
  FINAL: 150,
};

function compactar(ronda?: string | null): string {
  return String(ronda || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function esRondaDeZona(ronda?: string | null): boolean {
  return /^ZONA\s+/i.test(String(ronda || "").trim());
}

export function etiquetaRondaLlave(ronda?: string | null): string {
  const raw = String(ronda || "").trim();
  if (!raw) return "Partido";
  if (esRondaDeZona(raw)) return raw.replace(/^zona/i, "Zona");
  return ETIQUETAS[compactar(raw)] || raw;
}

export function ordenRondaLlave(ronda?: string | null): number {
  const raw = String(ronda || "").trim();
  const zona = raw.toUpperCase().match(/^ZONA\s+([A-Z0-9]+)/);
  if (zona) {
    const code = zona[1].charCodeAt(0);
    return code >= 65 && code <= 90 ? code - 65 : 40;
  }
  return ORDEN[compactar(raw)] ?? 200;
}

/** Código de ronda FAP a partir del número de la matriz (no se persiste). */
export function codigoRondaPorNumeroFap(matchNo: number): string {
  if (matchNo === 64) return "FINAL";
  if (matchNo === 61 || matchNo === 62) return "SEMIS";
  if (matchNo >= 57 && matchNo <= 60) return "CUARTOS";
  if (matchNo >= 49 && matchNo <= 56) return "OCTAVOS";
  if (matchNo >= 33 && matchNo <= 48) return "16AVOS";
  if (matchNo >= 17 && matchNo <= 32) return "32AVOS";
  return "LLAVE";
}

/**
 * Si hay 16 partidos de zona, el primero de la llave es el 17.
 * El orden de numeración es treintaidosavos → … → final, no el #57 de la matriz.
 */
function ordenarPorRonda(
  aRonda: string,
  aOrden: number,
  bRonda: string,
  bOrden: number,
): number {
  const porRonda = ordenRondaLlave(aRonda) - ordenRondaLlave(bRonda);
  if (porRonda !== 0) return porRonda;
  return aOrden - bOrden;
}

export function numerosVisiblesLlave(
  matchNos: number[],
  inicio: number,
): Map<number, number> {
  const sorted = [...matchNos].sort((a, b) =>
    ordenarPorRonda(
      codigoRondaPorNumeroFap(a),
      a,
      codigoRondaPorNumeroFap(b),
      b,
    ),
  );
  const map = new Map<number, number>();
  const base = Math.max(1, Math.floor(inicio) || 1);
  sorted.forEach((matchNo, index) => {
    map.set(matchNo, base + index);
  });
  return map;
}

/** Columna visual: la ronda más temprana a la izquierda, la final a la derecha. */
export function columnasRondaLlave(matchNos: number[]): Map<number, number> {
  const codes: string[] = [];
  const sorted = [...matchNos].sort((a, b) =>
    ordenarPorRonda(
      codigoRondaPorNumeroFap(a),
      a,
      codigoRondaPorNumeroFap(b),
      b,
    ),
  );
  for (const matchNo of sorted) {
    const code = codigoRondaPorNumeroFap(matchNo);
    if (!codes.includes(code)) codes.push(code);
  }
  const colByCode = new Map(codes.map((code, index) => [code, index]));
  const map = new Map<number, number>();
  for (const matchNo of matchNos) {
    map.set(matchNo, colByCode.get(codigoRondaPorNumeroFap(matchNo)) ?? 0);
  }
  return map;
}

export function claveRondaLlave(ronda?: string | null): string {
  const code = compactar(ronda);
  if (code === "PRELIMINARES" || code === "PRELIMINAR" || code === "16AVOS") {
    return "16AVOS";
  }
  if (code === "SEMIS" || code === "SEMIFINAL" || code === "SEMIFINALES") {
    return "SEMIS";
  }
  return code;
}

/**
 * Une cada partido guardado con el cruce de la matriz.
 * Si `orden` ya es el matchNo, se respeta. Si la llave se guardó con otro orden,
 * se empareja por ronda (el más bajo de la ronda con el primer cruce).
 */
export function vincularPartidosAMatriz(
  matchNos: number[],
  partidos: Array<{
    id: string;
    ronda?: string | null;
    orden?: number | null;
  }>,
): Map<number, string> {
  const slotsPorRonda = new Map<string, number[]>();
  for (const matchNo of matchNos) {
    const key = claveRondaLlave(codigoRondaPorNumeroFap(matchNo));
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

export function numerosVisiblesDePartidos(
  partidos: Array<{
    id: string;
    ronda?: string | null;
    orden?: number | null;
  }>,
): Map<string, number> {
  const zonas = partidos.filter((p) => esRondaDeZona(p.ronda));
  const llave = partidos.filter(
    (p) => !esRondaDeZona(p.ronda) && p.orden != null && !p.id.startsWith("empty-"),
  );
  const sorted = [...llave].sort((a, b) =>
    ordenarPorRonda(a.ronda || "", a.orden ?? 0, b.ronda || "", b.orden ?? 0),
  );
  const map = new Map<string, number>();
  const inicio = zonas.length + 1;
  sorted.forEach((partido, index) => {
    map.set(partido.id, inicio + index);
  });
  return map;
}
