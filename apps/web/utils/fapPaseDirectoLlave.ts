/** Helpers UI para pase directo FAP (semilla + hueco W*). */

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
): boolean {
  if (ladoClasificadoPaseDirectoProtegido(spec, semillaFap, slot)) return false;
  if (!spec) return true;
  const semillaPase = inferirSemillaPaseDirectoEnSpec(spec);
  if (semillaPase && ladoSemillaPaseDirecto(spec) === slot) return false;
  const ref = slot === "a" ? spec.a : spec.b;
  const ladoRival = ladoRivalPaseDirecto(spec);
  if (ladoRival === slot && (semillaFap?.trim() || semillaPase)) return true;
  if (refLadoBloqueadoPorMatriz(ref) && !semillaFap?.trim() && !semillaPase)
    return false;
  if (!refLadoBloqueadoPorMatriz(ref)) return true;
  return Boolean(semillaFap?.trim() || semillaPase);
}