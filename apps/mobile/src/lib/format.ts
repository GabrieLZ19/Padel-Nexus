import { parseIsoDate } from "@/src/lib/dateUtils";

const MESES_CORTOS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

export function formatCurrencyArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateShort(iso?: string | null): string {
  if (!iso) return "Sin fecha";
  const date = parseIsoDate(iso);
  if (!date) return "Sin fecha";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MESES_CORTOS[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatTime(value?: string | null): string {
  if (!value) return "";
  return value.slice(0, 5);
}

export function estadoTorneoLabel(estado: string): string {
  if (estado === "Inscripción") return "Inscripciones abiertas";
  return estado;
}

export function estadoTorneoColor(estado: string): string {
  switch (estado) {
    case "Inscripción":
      return "#10B981";
    case "En curso":
      return "#F59E0B";
    case "Finalizado":
      return "#3B82F6";
    default:
      return "#8A8A8A";
  }
}

export function getProximaReserva<T extends { fecha_reserva: string }>(
  reservas: T[],
): T | null {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const futuras = reservas
    .filter((r) => {
      const fecha = parseIsoDate(r.fecha_reserva);
      if (!fecha) return false;
      fecha.setHours(0, 0, 0, 0);
      return fecha.getTime() >= hoy.getTime();
    })
    .sort((a, b) => {
      const fa = parseIsoDate(a.fecha_reserva)?.getTime() ?? 0;
      const fb = parseIsoDate(b.fecha_reserva)?.getTime() ?? 0;
      return fa - fb;
    });

  return futuras[0] ?? null;
}

export function filtrarTorneosCerca<T extends { clubes?: { provincia?: string } | null }>(
  torneos: T[],
  provincia?: string | null,
  limit = 5,
): T[] {
  if (!provincia) return torneos.slice(0, limit);
  const enProvincia = torneos.filter(
    (t) => t.clubes?.provincia?.toLowerCase() === provincia.toLowerCase(),
  );
  return (enProvincia.length > 0 ? enProvincia : torneos).slice(0, limit);
}
