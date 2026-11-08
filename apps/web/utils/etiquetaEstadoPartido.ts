import type { Partido } from "@/utils/types";

type PartidoEstado = Pick<
  Partido,
  | "ganador"
  | "estado_partido"
  | "equipo_a_id"
  | "equipo_b_id"
  | "fecha_partido"
  | "cancha_asignada"
>;

function normalizarEstado(estado?: string | null): string {
  return (estado || "").trim().toLowerCase();
}

/** TOR-12: solo partidos con estado explícito en competencia activa. */
export function partidoEstaEnCurso(partido: PartidoEstado): boolean {
  if (partido.ganador != null) return false;
  const estado = normalizarEstado(partido.estado_partido);
  return estado === "en curso" || estado === "en_juego" || estado === "en juego";
}

/**
 * Etiqueta corta en tarjetas de llave (público y CRM).
 * No usar "En juego" solo por tener ambos equipos asignados.
 */
export function etiquetaEstadoPartidoLlave(partido: PartidoEstado): string {
  if (partido.ganador != null) return "Finalizado";

  const estado = normalizarEstado(partido.estado_partido);

  if (estado === "finalizado") return "Finalizado";
  if (partidoEstaEnCurso(partido)) return "En juego";
  if (estado.includes("pendiente")) return "Pendiente";
  if (estado === "programado") return "Programado";
  if (partido.fecha_partido || partido.cancha_asignada) return "Programado";
  if (partido.equipo_a_id && partido.equipo_b_id) return "Programado";
  return "Pendiente";
}
