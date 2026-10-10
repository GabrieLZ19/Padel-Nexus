/**
 * La categoría se muestra siempre como «7ª».
 * Acepta «7», «7a», «7ª», «7º» y «6TA», y no duplica «6TA 6TA».
 */
export function etiquetaCategoria(valor: string | null | undefined): string {
  const limpio = (valor ?? "").trim().replace(/\s+/g, " ");
  if (!limpio) return "";
  const repetida = limpio.match(/^(.+?)\s+\1$/i);
  const base = (repetida ? repetida[1] : limpio).replace(
    /\s+categor[ií]a$/i,
    "",
  );
  const ordinal = base.match(/^(\d+)\s*(?:ª|º|°|ta|a)?$/i);
  if (ordinal) return `${ordinal[1]}ª`;
  return base;
}

export function etiquetaNivelYCategoria(
  nivel?: string | null,
  categoria?: string | null,
): string {
  const n = etiquetaCategoria(nivel);
  const c = etiquetaCategoria(categoria);
  if (n && c && n.toLowerCase() === c.toLowerCase()) return n;
  return [n, c].filter(Boolean).join(" · ");
}
