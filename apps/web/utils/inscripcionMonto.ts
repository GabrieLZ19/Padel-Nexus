import { esModalidadIndividual } from "@/utils/formatFecha";

/** Etiqueta unificada FEE-8: el torneo guarda ARS por jugador. */
export const ETIQUETA_PRECIO_POR_JUGADOR = "Por jugador";

/** precio_inscripcion del torneo = ARS por jugador (plaza). */
export function plazasInscripcionPublico(input: {
  modalidad?: string | null;
  tieneCompanero?: boolean;
}): number {
  if (esModalidadIndividual(input.modalidad)) return 1;
  return input.tieneCompanero ? 2 : 1;
}

export function montoInscripcionPublico(
  precioPorJugador: number,
  plazas: number,
): number {
  return Math.round(
    Math.max(0, Number(precioPorJugador) || 0) * Math.max(1, plazas),
  );
}

export function montoInscripcionSugeridoDesdeTorneo(input: {
  precioPorJugador: number;
  modalidad?: string | null;
  tieneJugador2?: boolean;
  montoGuardado?: number | null;
}): number {
  const guardado = Number(input.montoGuardado || 0);
  if (guardado > 0) return guardado;
  const plazas = plazasInscripcionPublico({
    modalidad: input.modalidad,
    tieneCompanero: Boolean(input.tieneJugador2),
  });
  return montoInscripcionPublico(input.precioPorJugador, plazas);
}

export function textoDesglosePorJugador(
  precioPorJugador: number,
  plazas: number,
): string | null {
  if (plazas <= 1) return null;
  const unit = Number(precioPorJugador || 0);
  if (unit <= 0) return null;
  return `${plazas} jugadores × $${unit.toLocaleString("es-AR")} c/u`;
}

export function textoTotalParejaOpcional(
  precioPorJugador: number,
  esIndividual: boolean,
): string | null {
  if (esIndividual) return null;
  const unit = Number(precioPorJugador || 0);
  if (unit <= 0) return null;
  const total = montoInscripcionPublico(unit, 2);
  return `Pareja: $${total.toLocaleString("es-AR")} (2 jugadores)`;
}