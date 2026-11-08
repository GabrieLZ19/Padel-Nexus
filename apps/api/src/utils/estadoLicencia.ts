import { fechaHoyArgentina } from "./fechaArgentina";

export type EstadoLicenciaAlmacenado =
  | "Activa"
  | "Vencida"
  | "Pendiente"
  | "Suspendida"
  | string;

/**
 * True si la fecha de vencimiento (YYYY-MM-DD) es anterior al día actual en Argentina.
 * El día de vencimiento inclusivo sigue vigente hasta fin de ese día.
 */
export function fechaVencimientoPasada(
  fechaVencimiento?: string | null,
  ahora: Date = new Date(),
): boolean {
  if (!fechaVencimiento) return false;
  const fecha = String(fechaVencimiento).split("T")[0];
  if (!fecha || fecha.length < 10) return false;
  const hoy = fechaHoyArgentina(ahora);
  return fecha < hoy;
}

/**
 * Estado mostrado en CRM y perfil: una licencia "Activa" con vencimiento pasado es "Vencida".
 */
export function estadoEfectivoLicencia(
  estadoDb?: string | null,
  fechaVencimiento?: string | null,
  ahora: Date = new Date(),
): EstadoLicenciaAlmacenado {
  const estado = String(estadoDb || "").trim();
  if (estado === "Activa" && fechaVencimientoPasada(fechaVencimiento, ahora)) {
    return "Vencida";
  }
  if (!estado) return "Pendiente";
  return estado;
}

export function aplicarEstadoEfectivoLicencia<
  T extends { estado?: string | null; fecha_vencimiento?: string | null },
>(licencia: T): T {
  return {
    ...licencia,
    estado: estadoEfectivoLicencia(licencia.estado, licencia.fecha_vencimiento),
  };
}

export function normalizarLicenciasEnLista<
  T extends { estado?: string | null; fecha_vencimiento?: string | null },
>(licencias: T | T[] | null | undefined): T[] {
  const lista = Array.isArray(licencias)
    ? licencias
    : licencias
      ? [licencias]
      : [];
  return lista.map(aplicarEstadoEfectivoLicencia);
}

export function normalizarPerfilLicencias<
  P extends {
    licencias?: { estado?: string | null; fecha_vencimiento?: string | null }
      | { estado?: string | null; fecha_vencimiento?: string | null }[]
      | null;
  },
>(perfil: P): P {
  if (!perfil.licencias) return perfil;
  const licencias = normalizarLicenciasEnLista(perfil.licencias);
  const unica =
    licencias.length <= 1 ? (licencias[0] ?? null) : licencias;
  return {
    ...perfil,
    licencias: licencias.length <= 1 ? unica : licencias,
  } as P;
}

export function jugadorCoincideEstadoLicencia(
  perfil: {
    licencias?:
      | { estado?: string | null; fecha_vencimiento?: string | null }
      | { estado?: string | null; fecha_vencimiento?: string | null }[]
      | null;
  },
  estadoFiltro: string,
): boolean {
  const licencias = normalizarLicenciasEnLista(perfil.licencias);
  return licencias.some((l) => l.estado === estadoFiltro);
}
