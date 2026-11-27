/** Helpers UI para pase directo FAP (semilla + hueco W*). */

export type FapMatrizLlaveMatch = {
  matchNo: number;
  a: string;
  b: string;
};

export function entryMatchForLeafSeed(
  matrix: readonly FapMatrizLlaveMatch[],
  leaf: string,
): { matchNo: number; side: "a" | "b" } | null {
  const ref = leaf.trim().toUpperCase();
  for (const m of matrix) {
    if (m.a.toUpperCase() === ref) return { matchNo: m.matchNo, side: "a" };
    if (m.b.toUpperCase() === ref) return { matchNo: m.matchNo, side: "b" };
  }
  return null;
}

/** Solo el 1º de zona entra con pase directo materializable en llave FAP. */
export function esSemillaPaseDirectoFap(semilla: string): boolean {
  const p = parseZonePosSide(semilla);
  return p?.position === 1;
}

/**
 * El backend materializa rival solo en cruces seed-vs-W* del partido de entrada
 * o posteriores (cuarto con 1A vs Gan.). Cruces W*-vs-3C u octavos normales no aplican.
 */
export function slotPermiteAltaPaseDirecto(
  spec: { a: string; b: string } | null | undefined,
  matrix: readonly FapMatrizLlaveMatch[] | null | undefined,
  matchOrden: number | null | undefined,
  slot: "a" | "b",
  semillaFap?: string | null,
): boolean {
  if (!spec || !matrix?.length || matchOrden == null) return false;

  const semilla = (
    semillaFap?.trim() || inferirSemillaPaseDirectoEnSpec(spec) || ""
  ).toUpperCase();
  if (!semilla || !esSemillaPaseDirectoFap(semilla)) return false;
  if (ladoClasificadoPaseDirectoProtegido(spec, semilla, slot)) return false;

  const ladoRival = ladoRivalPaseDirecto(spec);
  if (ladoRival !== slot) return false;

  const refRival = slot === "a" ? spec.a : spec.b;
  if (!refRival.trim().startsWith("W")) return false;

  const entry = entryMatchForLeafSeed(matrix, semilla);
  if (!entry) return false;

  if (matchOrden === entry.matchNo) {
    if (inferirSemillaPaseDirectoEnSpec(spec)?.toUpperCase() !== semilla) {
      return false;
    }
    const refRivalEntrada =
      spec.a.toUpperCase() === semilla ? spec.b : spec.a;
    return refRivalEntrada.startsWith("W");
  }

  const ladoSemilla = ladoSemillaPaseDirecto(spec);
  if (!ladoSemilla) return false;
  const refSemilla =
    ladoSemilla === "a" ? spec.a.toUpperCase() : spec.b.toUpperCase();
  if (refSemilla !== semilla) return false;
  const refWRival = ladoSemilla === "a" ? spec.b : spec.a;
  return refWRival.startsWith("W");
}

export function parseZonePosSide(
  ref: string,
): { position: number; zone: string } | null {
  const m = /^([123])([A-L])$/i.exec(ref.trim());
  if (!m) return null;
  return { position: Number(m[1]), zone: m[2].toUpperCase() };
}

export function inferirSemillaPaseDirectoEnSpec(spec: {
  a: string;
  b: string;
}): string | null {
  const aSeed = !spec.a.startsWith("W") && parseZonePosSide(spec.a);
  const bSeed = !spec.b.startsWith("W") && parseZonePosSide(spec.b);
  if (aSeed && spec.b.startsWith("W")) return spec.a.toUpperCase();
  if (bSeed && spec.a.startsWith("W")) return spec.b.toUpperCase();
  return null;
}

export function ladoSemillaPaseDirecto(spec: {
  a: string;
  b: string;
}): "a" | "b" | null {
  const aSeed = !spec.a.startsWith("W") && parseZonePosSide(spec.a);
  const bSeed = !spec.b.startsWith("W") && parseZonePosSide(spec.b);
  if (aSeed && spec.b.startsWith("W")) return "a";
  if (bSeed && spec.a.startsWith("W")) return "b";
  return null;
}

export function ladoRivalPaseDirecto(spec: {
  a: string;
  b: string;
}): "a" | "b" | null {
  const semilla = ladoSemillaPaseDirecto(spec);
  if (!semilla) return null;
  return semilla === "a" ? "b" : "a";
}

/** Lado del clasificado (semilla) que no debe reemplazarse al materializar el rival. */
export function ladoClasificadoPaseDirectoProtegido(
  spec: { a: string; b: string } | null | undefined,
  semillaFap: string | null | undefined,
  slot: "a" | "b",
): boolean {
  if (!spec || !semillaFap?.trim()) return false;
  if (ladoSemillaPaseDirecto(spec) !== slot) return false;
  const ref = (slot === "a" ? spec.a : spec.b).trim().toUpperCase();
  return ref === semillaFap.trim().toUpperCase();
}

export function puedeUsarAltaParejaEnSlot(
  spec: { a: string; b: string } | null | undefined,
  semillaFap: string | null | undefined,
  slot: "a" | "b",
  refLadoBloqueadoPorMatriz: (ref: string) => boolean,
  contexto?: {
    matrix?: readonly FapMatrizLlaveMatch[] | null;
    matchOrden?: number | null;
  },
): boolean {
  if (ladoClasificadoPaseDirectoProtegido(spec, semillaFap, slot)) return false;
  if (!spec) return true;
  const semillaPase = inferirSemillaPaseDirectoEnSpec(spec);
  if (semillaPase && ladoSemillaPaseDirecto(spec) === slot) return false;
  const ref = slot === "a" ? spec.a : spec.b;
  const ladoRival = ladoRivalPaseDirecto(spec);
  const matrizFap = contexto?.matrix;
  const matchOrden = contexto?.matchOrden;

  if (ladoRival === slot && (semillaFap?.trim() || semillaPase)) {
    if (matrizFap?.length && matchOrden != null) {
      return slotPermiteAltaPaseDirecto(
        spec,
        matrizFap,
        matchOrden,
        slot,
        semillaFap,
      );
    }
    return true;
  }
  if (refLadoBloqueadoPorMatriz(ref) && !semillaFap?.trim() && !semillaPase)
    return false;
  if (!refLadoBloqueadoPorMatriz(ref)) return true;
  if (matrizFap?.length && matchOrden != null) {
    return slotPermiteAltaPaseDirecto(
      spec,
      matrizFap,
      matchOrden,
      slot,
      semillaFap,
    );
  }
  return Boolean(semillaFap?.trim() || semillaPase);
}