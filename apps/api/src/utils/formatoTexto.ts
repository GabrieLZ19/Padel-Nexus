/**
 * Utilidades para normalización y formato de textos y nombres.
 */

/**
 * Capitaliza una palabra individual preservando acrónimos cortos (ej: "QA", "FAP", "JR")
 * y formateando palabras en mayúsculas largas a Title Case (ej: "GABRIEL" -> "Gabriel").
 */
export function capitalizarPalabra(word: string): string {
  if (!word) return "";
  // Preservar siglas / acrónimos en mayúsculas cortas (ej: "QA", "JR", "FAP")
  if (word === word.toUpperCase() && word.length <= 4 && !/^\d+$/.test(word)) {
    return word;
  }
  // Si la palabra completa está en mayúsculas y es larga (ej: "GABRIEL"), Title Case
  if (word === word.toUpperCase()) {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  // Para cualquier otro caso, asegurar primer caracter en mayúscula sin alterar el resto
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Capitaliza un nombre o apellido respetando mayúsculas de siglas.
 */
export function capitalizarNombre(texto?: string): string {
  if (!texto) return "";
  return texto
    .trim()
    .split(/\s+/)
    .map(capitalizarPalabra)
    .join(" ");
}

/**
 * Si el usuario usó mayúsculas (p. ej. «QA»), conserva el texto; si viene todo en minúsculas, aplica capitalizarNombre.
 */
export function normalizarNombrePerfil(texto?: string): string {
  if (!texto) return "";
  const trimmed = texto.trim();
  if (!trimmed) return "";
  if (trimmed !== trimmed.toLowerCase()) return trimmed;
  return capitalizarNombre(trimmed);
}
