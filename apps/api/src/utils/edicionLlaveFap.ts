import type { FapBracketMatch } from "./fapBracketTypes";
import {
  estadoTrasAsignar,
  partidoConResultadoReal,
  type ParchePartido,
  type PartidoEditable,
} from "./edicionLlaveMenores";
import { LlaveConflictoError } from "./edicionLlaveDuplicados";

export function ladoEsReservadoGanador(ref: string | null | undefined): boolean {
  return Boolean(ref?.trim().startsWith("W"));
}

/**
 * Impide asignar o reemplazar parejas en lados que la matriz reserva
 * para el ganador de otro partido (W*).
 */
export function validarCambioEquiposConMatrizFap(
  spec: FapBracketMatch,
  prevA: string | null,
  prevB: string | null,
  nextA: string | null,
  nextB: string | null,
): void {
  if (ladoEsReservadoGanador(spec.a) && nextA !== prevA) {
    const origen = spec.a.slice(1);
    throw new LlaveConflictoError(
      `El lado A está reservado para el ganador del partido de matriz #${origen}. No podés asignar una pareja ahí manualmente.`,
    );
  }
  if (ladoEsReservadoGanador(spec.b) && nextB !== prevB) {
    const origen = spec.b.slice(1);
    throw new LlaveConflictoError(
      `El lado B está reservado para el ganador del partido de matriz #${origen}. No podés asignar una pareja ahí manualmente.`,
    );
  }
}

/**
 * Con matriz FAP no se finaliza un cruce por bye mientras falta el rival
 * (p. ej. Gan. #16 en el otro lado).
 */
export function estadoTrasAsignarConMatrizFap(
  partido: PartidoEditable,
  equipoAId: string | null,
  equipoBId: string | null,
  spec: FapBracketMatch | undefined,
): ParchePartido {
  if (spec) {
    if (partidoConResultadoReal(partido)) {
      throw new Error(
        "Ese partido ya tiene resultado. No se puede cambiar las parejas.",
      );
    }
    return {
      equipoAId,
      equipoBId,
      ganador: null,
      set1A: null,
      set1B: null,
      estado: "Programado",
    };
  }
  return estadoTrasAsignar(partido, equipoAId, equipoBId);
}
