import { FAP_ESTADOS_TORNEO } from "../constants/fap";

/**
 * Publicar la programación es el evento que pasa un torneo de Programado a En curso.
 * Una nueva edición de horarios no lo devuelve a Programado: sigue En curso.
 */
export function estadoAlPublicarProgramacion(
  estado: string | null | undefined,
): typeof FAP_ESTADOS_TORNEO.EN_CURSO | null {
  if ((estado || "").trim() !== FAP_ESTADOS_TORNEO.PROGRAMADO) return null;
  return FAP_ESTADOS_TORNEO.EN_CURSO;
}

/** La carga oficial de resultados empieza cuando el torneo ya está En curso. */
export function puedeCargarResultadoOficial(
  estado: string | null | undefined,
): boolean {
  const actual = (estado || "").trim();
  return (
    actual === FAP_ESTADOS_TORNEO.EN_CURSO ||
    actual === FAP_ESTADOS_TORNEO.FINALIZADO
  );
}

export const MENSAJE_RESULTADO_SIN_PUBLICAR =
  "Publicá la programación para pasar el torneo a En curso antes de cargar resultados.";
