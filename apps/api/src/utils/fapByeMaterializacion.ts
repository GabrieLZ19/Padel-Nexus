import type { FapBracketMatch } from "./fapBracketTypes";
import { parseZonePos } from "./fapBracketTypes";

export function entryMatchForLeafSeed(
  matrix: readonly FapBracketMatch[],
  leaf: string,
): { matchNo: number; side: "a" | "b" } | null {
  const ref = leaf.trim();
  for (const m of matrix) {
    if (m.a === ref) return { matchNo: m.matchNo, side: "a" };
    if (m.b === ref) return { matchNo: m.matchNo, side: "b" };
  }
  return null;
}

export function ladoConSemillaDirecta(
  spec: FapBracketMatch,
): { side: "a" | "b"; seed: string } | null {
  if (!spec.a.startsWith("W") && parseZonePos(spec.a)) {
    return { side: "a", seed: spec.a.toUpperCase() };
  }
  if (!spec.b.startsWith("W") && parseZonePos(spec.b)) {
    return { side: "b", seed: spec.b.toUpperCase() };
  }
  return null;
}

export function ladoReservadoGanador(spec: FapBracketMatch): "a" | "b" | null {
  if (spec.a.startsWith("W")) return "a";
  if (spec.b.startsWith("W")) return "b";
  return null;
}

/** Cruce hoja + hueco W* (p. ej. 1A vs W50): permite materializar rival en partido de entrada. */
export function inferirSemillaPaseDirectoEnSpec(
  spec: FapBracketMatch,
): string | null {
  const seedSide = ladoConSemillaDirecta(spec);
  const ladoW = ladoReservadoGanador(spec);
  if (!seedSide || !ladoW) return null;
  return seedSide.seed;
}

/**
 * Si el admin preparó alta en el lado del clasificado, mueve el payload al lado W*
 * para que la pareja nueva no reemplace al pase directo.
 */
export function corregirAltaEnPaseDirecto(
  spec: FapBracketMatch,
  tieneAltaA: boolean,
  tieneAltaB: boolean,
): {
  tieneAltaA: boolean;
  tieneAltaB: boolean;
  semillaInferida: string | null;
} {
  const seedSide = ladoConSemillaDirecta(spec);
  const ladoW = ladoReservadoGanador(spec);
  if (!seedSide || !ladoW) {
    return {
      tieneAltaA: tieneAltaA,
      tieneAltaB: tieneAltaB,
      semillaInferida: null,
    };
  }
  if (tieneAltaA && seedSide.side === "a") {
    return { tieneAltaA: false, tieneAltaB: true, semillaInferida: seedSide.seed };
  }
  if (tieneAltaB && seedSide.side === "b") {
    return { tieneAltaA: true, tieneAltaB: false, semillaInferida: seedSide.seed };
  }
  return {
    tieneAltaA,
    tieneAltaB,
    semillaInferida: inferirSemillaPaseDirectoEnSpec(spec),
  };
}

export type PlanMaterializarByeFap = {
  partidoEntradaOrden: number;
  ladoClasificado: "a" | "b";
  ladoRival: "a" | "b";
  inscripcionClasificada: string;
  inscripcionRival: string;
  /** Partido donde el admin guardó (puede ser el de entrada o uno posterior con bye). */
  partidoDestinoOrden: number;
  ladoDestinoALimpiar: "a" | "b" | null;
  /** true si el cruce se arma en el mismo partido que se editó (semilla vs rival en W*). */
  mismoPartidoEntrada: boolean;
};

/**
 * Alta o asignación de rival en un pase directo: el cruce real es el partido
 * de entrada de la semilla (p. ej. 1º A vs pareja nueva), no el slot W* del destino.
 */
export function planificarMaterializacionByeFap(
  specDestino: FapBracketMatch,
  matchDestinoOrden: number,
  matrix: readonly FapBracketMatch[],
  prevA: string | null,
  prevB: string | null,
  nextA: string | null,
  nextB: string | null,
  altaEnLado: "a" | "b" | undefined,
): PlanMaterializarByeFap | null {
  const seedSide = ladoConSemillaDirecta(specDestino);
  const ladoW = ladoReservadoGanador(specDestino);
  if (!seedSide || !ladoW) return null;

  const clasificado =
    seedSide.side === "a" ? nextA ?? prevA : nextB ?? prevB;
  if (!clasificado) return null;

  const rivalNuevo = ladoW === "a" ? nextA : nextB;
  const rivalPrevio = ladoW === "a" ? prevA : prevB;
  const rivalCambio = rivalNuevo && rivalNuevo !== rivalPrevio;
  if (!rivalNuevo || !rivalCambio) return null;

  if (!altaEnLado || altaEnLado !== ladoW) return null;

  const entry = entryMatchForLeafSeed(matrix, seedSide.seed);
  if (!entry) return null;

  const mismoPartidoEntrada = entry.matchNo === matchDestinoOrden;
  const specEntrada = matrix.find((m) => m.matchNo === entry.matchNo);
  const ladoDestinoALimpiar = mismoPartidoEntrada
    ? null
    : seedSide.side;

  const ladoClasificadoEnEntrada =
    specEntrada && specEntrada.a === seedSide.seed
      ? ("a" as const)
      : specEntrada && specEntrada.b === seedSide.seed
        ? ("b" as const)
        : entry.side;

  return {
    partidoEntradaOrden: entry.matchNo,
    ladoClasificado: ladoClasificadoEnEntrada,
    ladoRival: ladoClasificadoEnEntrada === "a" ? "b" : "a",
    inscripcionClasificada: clasificado,
    inscripcionRival: rivalNuevo,
    partidoDestinoOrden: matchDestinoOrden,
    ladoDestinoALimpiar,
    mismoPartidoEntrada,
  };
}

/** Alta de rival con semilla FAP explícita (p. ej. desde pase directo). */
export function planificarMaterializacionByeConSemilla(
  semilla: string,
  matchOrden: number,
  matrix: readonly FapBracketMatch[],
  prevA: string | null,
  prevB: string | null,
  nextA: string | null,
  nextB: string | null,
  altaEnLado: "a" | "b",
): PlanMaterializarByeFap | null {
  const entry = entryMatchForLeafSeed(matrix, semilla.toUpperCase());
  if (!entry) return null;

  const specEntrada = matrix.find((m) => m.matchNo === entry.matchNo);
  if (!specEntrada) return null;

  const specEditado = matrix.find((m) => m.matchNo === matchOrden);
  const specBase = specEditado ?? specEntrada;

  const seedSide = ladoConSemillaDirecta(specBase);
  const ladoW = ladoReservadoGanador(specBase);
  if (!seedSide || seedSide.seed !== semilla.toUpperCase() || !ladoW) {
    const rivalNuevo = altaEnLado === "a" ? nextA : nextB;
    const rivalPrevio = altaEnLado === "a" ? prevA : prevB;
    if (!rivalNuevo || rivalNuevo === rivalPrevio) return null;

    const candClasificado = [prevA, prevB, nextA, nextB].filter(
      (id): id is string => Boolean(id) && id !== rivalNuevo,
    );
    const clasificado = candClasificado[0] ?? null;
    if (!clasificado) return null;

    const ladoClasificadoEnEntrada =
      specEntrada.a === semilla.toUpperCase() ? ("a" as const) : ("b" as const);

    const mismoPartidoEntrada = entry.matchNo === matchOrden;
    return {
      partidoEntradaOrden: entry.matchNo,
      ladoClasificado: ladoClasificadoEnEntrada,
      ladoRival: ladoClasificadoEnEntrada === "a" ? "b" : "a",
      inscripcionClasificada: clasificado,
      inscripcionRival: rivalNuevo,
      partidoDestinoOrden: matchOrden,
      ladoDestinoALimpiar: mismoPartidoEntrada
        ? null
        : seedSide?.side ?? ladoClasificadoEnEntrada,
      mismoPartidoEntrada,
    };
  }

  return planificarMaterializacionByeFap(
    specBase,
    matchOrden,
    matrix,
    prevA,
    prevB,
    nextA,
    nextB,
    altaEnLado,
  );
}