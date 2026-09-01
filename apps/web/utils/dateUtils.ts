/**
 * Normaliza fechas de API/DB al formato requerido por `<input type="date">` (YYYY-MM-DD).
 * Evita desfaces por zona horaria al no usar `new Date()` para valores date-only.
 */
export function toDateInputValue(value?: string | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }
  return "";
}
