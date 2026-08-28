export const ZONA_HORARIA_ARGENTINA = "America/Argentina/Buenos_Aires";

type PartesFechaHora = {
  fecha: string;
  horas: number;
  minutos: number;
};

function partesEnArgentina(instante: Date): PartesFechaHora {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_HORARIA_ARGENTINA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const partes = formatter.formatToParts(instante);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((p) => p.type === tipo)?.value ?? "00";

  return {
    fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
    horas: Number(valor("hour")),
    minutos: Number(valor("minute")),
  };
}

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":");
  return Number(h) * 60 + Number(m ?? 0);
}

/** Fecha YYYY-MM-DD del día actual en Argentina. */
export function fechaHoyArgentina(ahora: Date = new Date()): string {
  return partesEnArgentina(ahora).fecha;
}

/**
 * Indica si el inicio del turno (fecha + hora local Argentina) ya pasó.
 * Usar en lugar de `new Date(\`\${fecha}T\${hora}\`)` para evitar desfasajes UTC.
 */
export function esHorarioReservaPasado(
  fechaReserva: string,
  horaInicio: string,
  ahora: Date = new Date(),
): boolean {
  const { fecha, horas, minutos } = partesEnArgentina(ahora);
  const minutosAhora = horas * 60 + minutos;
  const minutosTurno = horaAMinutos(horaInicio);

  if (fechaReserva < fecha) return true;
  if (fechaReserva > fecha) return false;
  return minutosTurno <= minutosAhora;
}

/** True cuando ya terminó el turno reservado (fecha + hora de fin en Argentina). */
export function esTurnoReservaFinalizado(
  fechaReserva: string,
  horaFin: string,
  ahora: Date = new Date(),
): boolean {
  return esHorarioReservaPasado(fechaReserva, horaFin, ahora);
}
