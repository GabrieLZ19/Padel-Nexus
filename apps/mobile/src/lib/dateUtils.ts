export const MONTH_LABELS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const;

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Mediodía local evita desfaces por DST / timezone en fechas históricas (p. ej. año 2000). */
export function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function toDateParts(date: Date): DateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  };
}

export function fromDateParts(parts: DateParts): Date {
  return createLocalDate(parts.year, parts.month, parts.day);
}

export function parseIsoDate(value: string, fallback = createLocalDate(2000, 1, 1)): Date {
  if (!value) return fallback;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return fallback;
  return createLocalDate(year, month, day);
}

export function formatIsoDate(date: Date): string {
  const { year, month, day } = toDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatDateDisplay(value: string): string {
  if (!value) return "";
  const { day, month, year } = toDateParts(parseIsoDate(value));
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

export function formatDateLong(date: Date): string {
  return formatDateLongFromParts(toDateParts(date));
}

export function formatDateLongFromParts(parts: DateParts): string {
  const date = fromDateParts(parts);
  const weekday = WEEKDAY_LABELS[date.getDay()];
  const month = MONTH_LABELS[parts.month - 1];
  return `${capitalize(weekday)}, ${parts.day} de ${month} de ${parts.year}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function daysInMonth(year: number, month: number): number {
  return createLocalDate(year, month, 0).getDate();
}

export function clampDate(date: Date, minimum: Date, maximum: Date): Date {
  const time = fromDateParts(toDateParts(date)).getTime();
  const minTime = fromDateParts(toDateParts(minimum)).getTime();
  const maxTime = fromDateParts(toDateParts(maximum)).getTime();

  if (time < minTime) return fromDateParts(toDateParts(minimum));
  if (time > maxTime) return fromDateParts(toDateParts(maximum));
  return fromDateParts(toDateParts(date));
}

export function isSameDay(a: Date, b: Date): boolean {
  const left = toDateParts(a);
  const right = toDateParts(b);
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

export function mergeDateParts(
  base: DateParts,
  patch: Partial<DateParts>,
): DateParts {
  const year = patch.year ?? base.year;
  const month = patch.month ?? base.month;
  let day = patch.day ?? base.day;
  const maxDay = daysInMonth(year, month);
  if (day > maxDay) day = maxDay;
  return { year, month, day };
}

export function proximosDias(cantidad = 14): { fecha: string; label: string }[] {
  const hoy = createLocalDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  );
  const items: { fecha: string; label: string }[] = [];

  for (let i = 0; i < cantidad; i++) {
    const date = new Date(hoy);
    date.setDate(hoy.getDate() + i);
    const parts = toDateParts(date);
    const weekday = WEEKDAY_LABELS[date.getDay()];
    const label =
      i === 0
        ? "Hoy"
        : i === 1
          ? "Mañana"
          : `${capitalize(weekday)} ${parts.day}/${parts.month}`;
    items.push({ fecha: formatIsoDate(date), label });
  }

  return items;
}

/** Etiquetas cortas para selector de fecha (Hoy 14, Dom 15). */
export function proximosDiasSelector(cantidad = 7): {
  fecha: string;
  diaCorto: string;
  numero: string;
  esHoy: boolean;
}[] {
  const hoy = createLocalDate(
    new Date().getFullYear(),
    new Date().getMonth() + 1,
    new Date().getDate(),
  );
  const diasCortos = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const items: {
    fecha: string;
    diaCorto: string;
    numero: string;
    esHoy: boolean;
  }[] = [];

  for (let i = 0; i < cantidad; i++) {
    const date = new Date(hoy);
    date.setDate(hoy.getDate() + i);
    const parts = toDateParts(date);
    items.push({
      fecha: formatIsoDate(date),
      diaCorto: i === 0 ? "Hoy" : diasCortos[date.getDay()],
      numero: String(parts.day),
      esHoy: i === 0,
    });
  }

  return items;
}

export function duracionMinutos(
  horaInicio?: string | null,
  horaFin?: string | null,
): number | null {
  if (!horaInicio || !horaFin) return null;
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFin.split(":").map(Number);
  if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return null;
  return hf * 60 + mf - (hi * 60 + mi);
}
