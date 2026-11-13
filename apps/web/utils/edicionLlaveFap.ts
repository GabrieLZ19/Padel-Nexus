export function ladoEsReservadoGanador(ref: string | null | undefined): boolean {
  return Boolean(ref?.trim().startsWith("W"));
}

export function ladoSlotBloqueadoPorMatriz(
  ref: string | null | undefined,
): boolean {
  return ladoEsReservadoGanador(ref);
}
