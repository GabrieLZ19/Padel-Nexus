import { esModalidadIndividual } from "./modalidad";

/**
 * precio_inscripcion del torneo = valor por jugador (plaza).
 * Pareja: monto total = precio × 2 en un solo cobro / inscripción.
 */
export function plazasInscripcionDesdeContexto(input: {
  modalidad?: string | null;
  jugador2Id?: string | null;
  jugador2Email?: string | null;
  jugador2Nombre?: string | null;
  jugador2Identificador?: string | null;
}): number {
  if (input.jugador2Identificador?.trim()) return input.modalidad && esModalidadIndividual(input.modalidad) ? 1 : 2;
  if (esModalidadIndividual(input.modalidad)) return 1;
  if (input.jugador2Id) return 2;
  if (input.jugador2Email?.trim()) return 2;
  const n2 = (input.jugador2Nombre || "").trim();
  if (n2 && n2 !== "-") return 2;
  return 1;
}

export function montoInscripcionDesdePrecioTorneo(
  precioPorPlaza: number,
  plazas: number,
): number {
  const precio = Number(precioPorPlaza) || 0;
  const n = Math.max(1, plazas);
  return Math.round(precio * n);
}

export function precioUnitarioDesdeMonto(
  montoTotal: number,
  plazas: number,
): number {
  const n = Math.max(1, plazas);
  const total = Number(montoTotal) || 0;
  return Math.round(total / n);
}