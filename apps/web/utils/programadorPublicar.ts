import type { ProgramacionBoard } from "@/utils/services/torneos";

/** Motivo por el que no se puede publicar; null si está habilitado. */
export function motivoPublicacionBloqueada(
  board: ProgramacionBoard,
  opts?: { isReadOnly?: boolean },
): string | null {
  if (opts?.isReadOnly || board.programacion_estado === "publicado") {
    return null;
  }
  if (board.solo_lectura) {
    return (
      board.aviso_alcance ||
      "No tenés permiso para publicar la programación de este torneo."
    );
  }
  if (!board.dias.length) {
    return "Agregá al menos un club con canchas y fechas antes de publicar.";
  }
  if (board.summary.pendientes > 0) {
    const n = board.summary.pendientes;
    return `Faltan ${n} partido${n === 1 ? "" : "s"} sin horario. Asignalos en la grilla, en «Pendientes» o con «Asignar automáticamente».`;
  }
  const graves = board.issues.filter((i) => i.severity === "bad");
  if (graves.length > 0) {
    return `Hay ${graves.length} conflicto(s) grave(s) en la programación (orden de llave, canchas o descanso). Corregilos en las alertas antes de publicar.`;
  }
  return null;
}

export function puedePublicarProgramacion(
  board: ProgramacionBoard,
  opts?: { isReadOnly?: boolean },
): boolean {
  if (opts?.isReadOnly || board.programacion_estado === "publicado") {
    return false;
  }
  return motivoPublicacionBloqueada(board, opts) === null;
}
