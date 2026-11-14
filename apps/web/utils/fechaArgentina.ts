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

export function fechaLatina(iso?: string | null): string {
  if (!iso) return "";
  const [year, month, day] = iso.split("T")[0].split("-");
  if (!year || !month || !day) return "";
  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
}

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

export function fechaHoyArgentina(ahora: Date = new Date()): string {
  return partesEnArgentina(ahora).fecha;
}

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

export function formatearFechaHoraArgentina(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA_HORARIA_ARGENTINA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${partes} hs`;
}

function restarDiasCalendario(fechaIso: string, dias: number): string {
  const [y, m, d] = fechaIso.split("-").map(Number);
  const calendario = new Date(Date.UTC(y, m - 1, d));
  calendario.setUTCDate(calendario.getUTCDate() + dias);
  const anio = calendario.getUTCFullYear();
  const mes = String(calendario.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(calendario.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function hora24Argentina(instante: Date): string {
  const { horas, minutos } = partesEnArgentina(instante);
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

/**
 * Marca de tiempo para el panel de notificaciones (PUB-17):
 * Hoy HH:mm, Ayer, o dd/mm HH:mm en zona Argentina.
 */
export function formatMarcaTiempoNotificacion(
  iso?: string | null,
  ahora: Date = new Date(),
): string {
  if (!iso) return "";
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return "";

  const fecha = partesEnArgentina(instante).fecha;
  const hora = hora24Argentina(instante);
  const hoy = fechaHoyArgentina(ahora);
  const ayer = restarDiasCalendario(hoy, -1);

  if (fecha === hoy) return `Hoy ${hora}`;
  if (fecha === ayer) return "Ayer";

  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes} ${hora}`;
}

export function fechaCalendarioArgentinaDesdeIso(
  iso: string,
  ahora: Date = new Date(),
): string {
  const instante = new Date(iso);
  if (Number.isNaN(instante.getTime())) return "";
  void ahora;
  return partesEnArgentina(instante).fecha;
}

/** Separador de día en hilos de chat: Hoy, Ayer o dd/mm/aaaa. */
export function formatSeparadorDiaChat(
  iso?: string | null,
  ahora: Date = new Date(),
): string {
  if (!iso) return "";
  const fecha = fechaCalendarioArgentinaDesdeIso(iso, ahora);
  if (!fecha) return "";
  const hoy = fechaHoyArgentina(ahora);
  const ayer = restarDiasCalendario(hoy, -1);
  if (fecha === hoy) return "Hoy";
  if (fecha === ayer) return "Ayer";
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}
