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