import type { PartidoAbiertoInscripto } from "@/utils/types/partido-abierto.types";

/** Tamaño de un partido de pádel en convocatorias abiertas. */
export const JUGADORES_PARTIDO_ABIERTO = 4;

export function jugadoresConfirmadosDesdeFaltantes(
  jugadoresFaltantes: number,
): number {
  const faltantes = Math.max(0, Math.floor(jugadoresFaltantes));
  return Math.min(
    JUGADORES_PARTIDO_ABIERTO,
    Math.max(0, JUGADORES_PARTIDO_ABIERTO - faltantes),
  );
}

export function jugadoresFaltantesDesdeConfirmados(
  jugadoresConfirmados: number,
): number {
  const confirmados = Math.floor(jugadoresConfirmados);
  if (confirmados < 1 || confirmados >= JUGADORES_PARTIDO_ABIERTO) {
    throw new Error("jugadores_confirmados_invalido");
  }
  return JUGADORES_PARTIDO_ABIERTO - confirmados;
}

export type SlotPartidoAbierto =
  | { tipo: "inscripto"; inscripto: PartidoAbiertoInscripto }
  | { tipo: "confirmado_sin_perfil" }
  | { tipo: "libre" };

export function slotsPartidoAbierto(
  jugadoresFaltantes: number,
  inscriptos: PartidoAbiertoInscripto[],
): SlotPartidoAbierto[] {
  const confirmados = jugadoresConfirmadosDesdeFaltantes(jugadoresFaltantes);
  const placeholders = Math.max(0, confirmados - inscriptos.length);
  const slots: SlotPartidoAbierto[] = [];

  for (const inscripto of inscriptos) {
    slots.push({ tipo: "inscripto", inscripto });
  }
  for (let i = 0; i < placeholders; i += 1) {
    slots.push({ tipo: "confirmado_sin_perfil" });
  }
  while (slots.length < JUGADORES_PARTIDO_ABIERTO) {
    slots.push({ tipo: "libre" });
  }
  return slots;
}
