import { fechaHoyArgentina } from "./fechaArgentina";

export type EstadoLicenciaAlmacenado =
  | "Activa"
  | "Vencida"
  | "Pendiente"
  | "Suspendida"
  | string;

export type EstadoLicenciaPublica =
  | "activa"
  | "vencida"
  | "suspendida"
  | "no_valida";

const ESTADOS_CANONICOS: Record<string, EstadoLicenciaAlmacenado> = {
  activa: "Activa",
  vencida: "Vencida",
  pendiente: "Pendiente",
  suspendida: "Suspendida",
  rechazada: "Rechazada",
};

/** Unifica mayúsculas/acentos del estado persistido en `licencias.estado`. */
export function normalizarEstadoAlmacenadoLicencia(
  estadoDb?: string | null,
): EstadoLicenciaAlmacenado {
  const raw = String(estadoDb || "").trim();
  if (!raw) return "Pendiente";
  const key = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ESTADOS_CANONICOS[key] ?? raw;
}

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
  const estado = normalizarEstadoAlmacenadoLicencia(estadoDb);
  if (estado === "Activa" && fechaVencimientoPasada(fechaVencimiento, ahora)) {
    return "Vencida";
  }
  return estado;
}

/** Estado expuesto en /verificar (público, sin datos sensibles). */
export function resolverEstadoLicenciaPublica(
  estadoDb: string | null | undefined,
  fechaVencimiento: string | null | undefined,
  ahora: Date = new Date(),
): { estado: EstadoLicenciaPublica; valida: boolean } {
  const efectivo = estadoEfectivoLicencia(estadoDb, fechaVencimiento, ahora);

  if (efectivo === "Suspendida") {
    return { estado: "suspendida", valida: false };
  }
  if (efectivo === "Pendiente" || efectivo === "Rechazada") {
    return { estado: "no_valida", valida: false };
  }
  if (efectivo === "Vencida") {
    return { estado: "vencida", valida: false };
  }
  if (efectivo === "Activa") {
    return { estado: "activa", valida: true };
  }
  return { estado: "no_valida", valida: false };
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
  return {
    ...perfil,
    licencias,
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
