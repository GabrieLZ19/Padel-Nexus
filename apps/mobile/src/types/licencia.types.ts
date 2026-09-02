export type EstadoLicencia =
  | "Pendiente"
  | "Activa"
  | "Vencida"
  | "Suspendida";

export interface Licencia {
  id: string;
  usuario_id: string;
  nro_licencia: string;
  estado: EstadoLicencia | string;
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  created_at?: string;
  precio_anual?: number;
  estado_pago?: string;
  datos_solicitud?: {
    documento?: string;
    provincia?: string;
    club_id?: string;
    precio_anual?: number;
    estado_pago?: string;
    monto_pagado?: number;
  } | null;
}

export interface LicenciaCotizacion {
  precio_anual: number;
  moneda: string;
  vigencia_modo?: string;
  descripcion_vigencia?: string;
  origen?: string;
}

export function licenciaEstadoPago(licencia: Licencia | null): string {
  if (!licencia) return "sin_licencia";
  return (
    licencia.estado_pago ||
    licencia.datos_solicitud?.estado_pago ||
    "no_aplica"
  );
}

export function licenciaPrecioAnual(licencia: Licencia | null): number {
  if (!licencia) return 0;
  return Number(
    licencia.precio_anual ??
      licencia.datos_solicitud?.precio_anual ??
      0,
  );
}
