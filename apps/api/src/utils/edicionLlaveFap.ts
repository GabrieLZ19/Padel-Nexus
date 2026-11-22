import type { FapBracketMatch } from "./fapBracketTypes";
import {
  estadoTrasAsignar,
  partidoConResultadoReal,
  type ParchePartido,
  type PartidoEditable,
} from "./edicionLlaveMenores";
import { LlaveConflictoError } from "./edicionLlaveDuplicados";
import {
  planificarMaterializacionByeConSemilla,
  planificarMaterializacionByeFap,
} from "./fapByeMaterializacion";

/** Marcador interno para simular una inscripción pendiente en prevalidación TOR-50. */
export const PLACEHOLDER_INSCRIPCION_ALTA_LLAVE =
  "00000000-0000-4000-8000-000000000001";

export function proyectarNextTrasAltaPendiente(
  prevA: string | null,
  prevB: string | null,
  equipoAId: string | null,
  equipoBId: string | null,
  hayAltaA: boolean,
  hayAltaB: boolean,
): { nextA: string | null; nextB: string | null } {
  return {
    nextA: hayAltaA
      ? (equipoAId ?? PLACEHOLDER_INSCRIPCION_ALTA_LLAVE)
      : equipoAId,
    nextB: hayAltaB
      ? (equipoBId ?? PLACEHOLDER_INSCRIPCION_ALTA_LLAVE)
      : equipoBId,
  };
}

export function debeOmitirValidacionMatrizFapAlta(
  spec: FapBracketMatch,
  matchOrden: number,
  matrix: readonly FapBracketMatch[],
  prevA: string | null,
  prevB: string | null,
  nextA: string | null,
  nextB: string | null,
  altaLado: "a" | "b" | undefined,
  semillaFap?: string,
): boolean {
  if (!altaLado) return false;
  const plan =
    planificarMaterializacionByeFap(
      spec,
      matchOrden,
      matrix,
      prevA,
      prevB,
      nextA,
      nextB,
      altaLado,
    ) ??
    (semillaFap
      ? planificarMaterializacionByeConSemilla(
          semillaFap,
          matchOrden,
          matrix,
          prevA,
          prevB,
          nextA,
          nextB,
          altaLado,
        )
      : null);
  return Boolean(plan);
}

/**
 * TOR-50: valida disponibilidad del slot (p. ej. lado W*) antes de crear la inscripción.
 */
export function prevalidarAltaEnSlotLlaveFap(
  spec: FapBracketMatch,
  matchOrden: number,
  matrix: readonly FapBracketMatch[],
  prevA: string | null,
  prevB: string | null,
  equipoAId: string | null,
  equipoBId: string | null,
  hayAltaA: boolean,
  hayAltaB: boolean,
  semillaFap?: string,
  resolverNumeroVisible?: (matchNoMatriz: number) => number,
): void {
  if (!hayAltaA && !hayAltaB) return;

  const { nextA, nextB } = proyectarNextTrasAltaPendiente(
    prevA,
    prevB,
    equipoAId,
    equipoBId,
    hayAltaA,
    hayAltaB,
  );
  const altaLado = hayAltaA ? ("a" as const) : ("b" as const);

  if (
    debeOmitirValidacionMatrizFapAlta(
      spec,
      matchOrden,
      matrix,
      prevA,
      prevB,
      nextA,
      nextB,
      altaLado,
      semillaFap,
    )
  ) {
    return;
  }

  validarCambioEquiposConMatrizFap(
    spec,
    prevA,
    prevB,
    nextA,
    nextB,
    resolverNumeroVisible,
  );
}

export function ladoEsReservadoGanador(ref: string | null | undefined): boolean {
  return Boolean(ref?.trim().startsWith("W"));
}

function etiquetaPartidoOrigenW(
  refW: string,
  resolverNumeroVisible?: (matchNoMatriz: number) => number,
): string {
  const matchNo = Number(refW.slice(1));
  if (resolverNumeroVisible && Number.isFinite(matchNo)) {
    return `partido #${resolverNumeroVisible(matchNo)}`;
  }
  return `partido de matriz #${refW.slice(1)}`;
}

function mensajeLadoReservadoGanador(
  lado: "A" | "B",
  refW: string,
  resolverNumeroVisible?: (matchNoMatriz: number) => number,
): string {
  return `El lado ${lado} está reservado para el ganador del ${etiquetaPartidoOrigenW(refW, resolverNumeroVisible)}. No podés asignar una pareja ahí manualmente.`;
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
  resolverNumeroVisible?: (matchNoMatriz: number) => number,
): void {
  if (ladoEsReservadoGanador(spec.a) && nextA !== prevA) {
    throw new LlaveConflictoError(
      mensajeLadoReservadoGanador("A", spec.a, resolverNumeroVisible),
    );
  }
  if (ladoEsReservadoGanador(spec.b) && nextB !== prevB) {
    throw new LlaveConflictoError(
      mensajeLadoReservadoGanador("B", spec.b, resolverNumeroVisible),
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
