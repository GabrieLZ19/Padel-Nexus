/** Tamaño de un partido de pádel en convocatorias abiertas. */
export const JUGADORES_PARTIDO_ABIERTO = 4;

export function jugadoresFaltantesDesdeConfirmados(
  jugadoresConfirmados: number,
): number {
  const confirmados = Math.floor(jugadoresConfirmados);
  if (!Number.isInteger(confirmados) || confirmados < 1 || confirmados > 3) {
    throw new Error(
      "jugadores_confirmados debe ser un entero entre 1 y 3 (partido de 4).",
    );
  }
  return JUGADORES_PARTIDO_ABIERTO - confirmados;
}

export function jugadoresConfirmadosDesdeFaltantes(
  jugadoresFaltantes: number,
): number {
  const faltantes = Math.max(0, Math.floor(jugadoresFaltantes));
  return Math.min(
    JUGADORES_PARTIDO_ABIERTO,
    Math.max(0, JUGADORES_PARTIDO_ABIERTO - faltantes),
  );
}
