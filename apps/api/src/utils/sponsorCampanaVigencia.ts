import { fechaHoyArgentina } from "./fechaArgentina";

export type EstadoSponsorCampana =
  | "borrador"
  | "activa"
  | "finalizada"
  | "pausada";

export function fechaCalendarioCampanaSponsor(valor?: string | null): string {
  if (!valor) return "";
  return valor.split("T")[0].slice(0, 10);
}

/** Período cerrado: el último día inclusive es fecha_fin; vence al día siguiente (hora Argentina). */
export function campanaSponsorVencida(
  fechaFin: string | null | undefined,
  hoy: string = fechaHoyArgentina(),
): boolean {
  const fin = fechaCalendarioCampanaSponsor(fechaFin);
  if (!fin) return false;
  return fin < hoy;
}

export function estadoEfectivoCampanaSponsor(
  estado: string,
  fechaFin: string | null | undefined,
  hoy: string = fechaHoyArgentina(),
): EstadoSponsorCampana {
  const base = (estado || "borrador") as EstadoSponsorCampana;
  if (base === "activa" && campanaSponsorVencida(fechaFin, hoy)) {
    return "finalizada";
  }
  return base;
}

export function estadoPersistibleCampanaSponsor(
  estado: EstadoSponsorCampana | string | undefined,
  fechaFin: string,
  hoy: string = fechaHoyArgentina(),
): EstadoSponsorCampana {
  const base = (estado || "borrador") as EstadoSponsorCampana;
  if (base === "activa" && campanaSponsorVencida(fechaFin, hoy)) {
    return "finalizada";
  }
  return base;
}

/** Para espacios públicos: solo activa y dentro del rango [fecha_inicio, fecha_fin]. */
export function campanaSponsorVisiblePublico(
  estado: string,
  fechaInicio: string | null | undefined,
  fechaFin: string | null | undefined,
  hoy: string = fechaHoyArgentina(),
): boolean {
  if (estadoEfectivoCampanaSponsor(estado, fechaFin, hoy) !== "activa") {
    return false;
  }
  const inicio = fechaCalendarioCampanaSponsor(fechaInicio);
  const fin = fechaCalendarioCampanaSponsor(fechaFin);
  if (!inicio || !fin) return false;
  return inicio <= hoy && hoy <= fin;
}
