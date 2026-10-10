import {
  fechaHoyArgentina,
  ZONA_HORARIA_ARGENTINA,
} from "./fechaArgentina";

export type CandidatoPartido = {
  id: string;
  fecha: string | null;
  jugado: boolean;
};

function fechaEnArgentina(iso: string): string | null {
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA_ARGENTINA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
}

/**
 * El próximo partido es el pendiente más cercano desde hoy en Argentina.
 * Si todos los pendientes ya pasaron de fecha, queda el más antiguo sin jugar.
 */
export function elegirProximoPartido<T extends CandidatoPartido>(
  partidos: T[],
  ahora: Date = new Date(),
): T | null {
  const pendientes = partidos.filter((partido) => !partido.jugado);
  if (pendientes.length === 0) return null;

  const hoy = fechaHoyArgentina(ahora);
  const conFecha = pendientes
    .map((partido) => ({
      partido,
      dia: partido.fecha ? fechaEnArgentina(partido.fecha) : null,
      instante: partido.fecha ? new Date(partido.fecha).getTime() : 0,
    }))
    .filter((item) => item.dia)
    .sort((a, b) => a.instante - b.instante);

  const desdeHoy = conFecha.find((item) => String(item.dia) >= hoy);
  if (desdeHoy) return desdeHoy.partido;
  if (conFecha[0]) return conFecha[0].partido;

  return pendientes.find((partido) => !partido.fecha) ?? null;
}
