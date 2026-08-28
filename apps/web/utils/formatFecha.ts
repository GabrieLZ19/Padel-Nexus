/**
 * Fechas de calendario (YYYY-MM-DD o ISO a medianoche UTC)
 * se muestran en zona local sin correr un día.
 */
export function formatFechaCalendario(
  fecha?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
): string {
  if (!fecha) return "Sin fecha";
  const day = fecha.includes("T") ? fecha.split("T")[0] : fecha.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const parsed = new Date(fecha);
    if (Number.isNaN(parsed.getTime())) return "Sin fecha";
    return parsed.toLocaleDateString("es-AR", options);
  }
  return new Date(`${day}T12:00:00`).toLocaleDateString("es-AR", options);
}

export const MODALIDAD_PAREJAS = "Parejas";
export const MODALIDAD_INDIVIDUAL = "Individual";

export function esModalidadIndividual(modalidad?: string | null): boolean {
  return /individual/i.test(String(modalidad || ""));
}

/** Incluye el valor legacy "Duplas" guardado en torneos anteriores. */
export function esModalidadParejas(modalidad?: string | null): boolean {
  return !esModalidadIndividual(modalidad);
}

export function labelModalidad(modalidad?: string | null): string {
  return esModalidadIndividual(modalidad)
    ? MODALIDAD_INDIVIDUAL
    : MODALIDAD_PAREJAS;
}

export function nombreJugadorVisible(nombre?: string | null): boolean {
  const n = String(nombre || "").trim();
  if (!n || n === "-") return false;
  return n.toLowerCase() !== "libre";
}
