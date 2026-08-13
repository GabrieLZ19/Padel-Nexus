export const AFILIACION_ESTADOS = {
  PENDIENTE: "pendiente",
  ACTIVO: "activo",
  RECHAZADO: "rechazado",
  BAJA: "baja",
  SUSPENDIDO: "suspendido",
} as const;

export type EstadoAfiliacion =
  (typeof AFILIACION_ESTADOS)[keyof typeof AFILIACION_ESTADOS];

export const AFILIACION_ESTADOS_BLOQUEANTES = [
  AFILIACION_ESTADOS.PENDIENTE,
  AFILIACION_ESTADOS.ACTIVO,
] as const;

export function esAfiliacionActiva(estado?: string | null): boolean {
  return (estado || "").toLowerCase() === AFILIACION_ESTADOS.ACTIVO;
}

export function esAfiliacionVisible(estado?: string | null): boolean {
  const e = (estado || "").toLowerCase();
  return (
    e !== AFILIACION_ESTADOS.SUSPENDIDO &&
    e !== AFILIACION_ESTADOS.RECHAZADO &&
    e !== AFILIACION_ESTADOS.BAJA
  );
}
