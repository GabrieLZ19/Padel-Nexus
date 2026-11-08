import type { Licencia } from "@/utils/types";

/**
 * PostgREST y el API a veces devuelven una sola licencia como objeto (no array).
 * Normaliza siempre a lista para el CRM.
 */
export function licenciasComoArray(
  licencias?: Licencia | Licencia[] | null,
): Licencia[] {
  if (!licencias) return [];
  return Array.isArray(licencias) ? licencias : [licencias];
}

/** Prioridad de visualización en el listado de licencias. */
export function licenciaPreferidaListado(
  licencias?: Licencia | Licencia[] | null,
): Licencia | null {
  const licList = licenciasComoArray(licencias);
  if (licList.length === 0) return null;
  const pending = licList.find((l) => l.estado === "Pendiente");
  if (pending) return pending;
  const active = licList.find((l) => l.estado === "Activa");
  if (active) return active;
  const vencida = licList.find((l) => l.estado === "Vencida");
  if (vencida) return vencida;
  return licList[0];
}
