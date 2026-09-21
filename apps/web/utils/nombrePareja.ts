/**
 * Normaliza nombres de jugador/pareja para UI y PDFs.
 * En individuales `jugador2_nombre` suele guardarse como "-" y no debe mostrarse.
 */
export function cleanJugadorNombre(name?: string | null): string {
  if (!name) return "";
  const cleaned = name
    .trim()
    .replace(/^[\s,.\-]+/, "")
    .replace(/[\s,.\-]+$/, "");
  if (
    !cleaned ||
    cleaned === "," ||
    cleaned === "." ||
    cleaned === "-" ||
    cleaned.toLowerCase() === "libre"
  ) {
    return "";
  }
  return cleaned;
}

/** "Apellido, Nombre / Apellido, Nombre" o solo el primero si es individual. */
export function formatNombrePareja(
  j1?: string | null,
  j2?: string | null,
): string {
  const a = cleanJugadorNombre(j1);
  const b = cleanJugadorNombre(j2);
  if (a && b) return `${a} / ${b}`;
  if (a) return a;
  if (b) return b;
  return "";
}
