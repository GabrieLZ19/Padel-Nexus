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

/** Fecha de calendario YYYY-MM-DD mostrada como DD/MM/AAAA, sin corrimiento de huso. */
export function fechaLatina(iso?: string | null): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("T")[0].split("-");
  if (!year || !month || !day) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

/** Fecha y hora en Argentina (dd/mm/aaaa HH:mm). */
export function fechaHoraLatinaArgentina(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA_ARGENTINA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
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

function diaSemanaCortoArgentina(fechaCalendario: string): string {
  const [y, m, d] = fechaCalendario.split("-").map(Number);
  if (!y || !m || !d) return "";
  const ancla = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const crudo = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA_ARGENTINA,
    weekday: "short",
  }).format(ancla);
  return crudo.replace(/\.$/, "").trim();
}

/**
 * Fecha de turno reservado para copys de notificación (RES-16): «del sáb 14/11 a las 20:00 hs».
 */
export function fraseFechaTurnoReserva(
  fechaReserva: string,
  horaInicio: string,
): string {
  const fecha = String(fechaReserva || "").split("T")[0];
  const hora = String(horaInicio || "00:00").slice(0, 5);
  const [, mes, dia] = fecha.split("-");
  if (!mes || !dia) return `del ${fecha} a las ${hora} hs`;
  const diaSemana = diaSemanaCortoArgentina(fecha);
  const prefijoDia = diaSemana ? `del ${diaSemana} ` : "del ";
  return `${prefijoDia}${dia.padStart(2, "0")}/${mes.padStart(2, "0")} a las ${hora} hs`;
}
