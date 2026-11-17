import { esModalidadIndividual } from "@/utils/formatFecha";

/** precio_inscripcion del torneo = ARS por plaza (jugador). */
export function plazasInscripcionPublico(input: {
  modalidad?: string | null;
  tieneCompanero?: boolean;
}): number {
  if (esModalidadIndividual(input.modalidad)) return 1;
  return input.tieneCompanero ? 2 : 1;
}

export function montoInscripcionPublico(
  precioPorPlaza: number,
  plazas: number,
): number {
  return Math.round(Math.max(0, Number(precioPorPlaza) || 0) * Math.max(1, plazas));
}