import { fechaHoyArgentina } from "./fechaArgentina";

/** Día local Argentina (YYYY-MM-DD) del primer partido programado. */
export function diaPrimerPartidoArgentina(
  fechaPrimerPartido?: string | null,
): string | null {
  if (!fechaPrimerPartido) return null;
  const iso = String(fechaPrimerPartido).trim();
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export interface VistaEstadoTorneoPublico {
  etiqueta: string;
  mostrarEnVivo: boolean;
  mostrarProgramado: boolean;
}

/** PUB-31: «Próximo/Programado» hasta el día del 1.er partido; «En curso» desde ese día. */
export function vistaEstadoTorneoPublico(params: {
  estado?: string | null;
  fechaPrimerPartido?: string | null;
  ahora?: Date;
}): VistaEstadoTorneoPublico {
  const estado = String(params.estado || "")
    .trim()
    .toLowerCase();
  const hoy = fechaHoyArgentina(params.ahora ?? new Date());
  const diaPrimer = diaPrimerPartidoArgentina(params.fechaPrimerPartido);
  const antesDelPrimerPartido =
    estado === "en curso" && diaPrimer != null && hoy < diaPrimer;

  if (antesDelPrimerPartido) {
    return {
      etiqueta: "Próximo",
      mostrarEnVivo: false,
      mostrarProgramado: true,
    };
  }

  if (estado === "en curso") {
    return {
      etiqueta: "En curso",
      mostrarEnVivo: true,
      mostrarProgramado: false,
    };
  }

  if (estado === "programado") {
    return {
      etiqueta: "Programado",
      mostrarEnVivo: false,
      mostrarProgramado: true,
    };
  }

  if (estado === "inscripción" || estado === "borrador") {
    return { etiqueta: "Abierto", mostrarEnVivo: false, mostrarProgramado: false };
  }

  if (estado === "cerrado") {
    return { etiqueta: "Cerrado", mostrarEnVivo: false, mostrarProgramado: false };
  }

  if (estado === "finalizado") {
    return { etiqueta: "Finalizado", mostrarEnVivo: false, mostrarProgramado: false };
  }

  return {
    etiqueta: params.estado?.trim() || "Torneo",
    mostrarEnVivo: false,
    mostrarProgramado: false,
  };
}