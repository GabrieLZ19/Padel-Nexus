import type { Licencia } from "@/utils/types";

export function licenciaEstadoPago(licencia: Licencia | null | undefined): string {
  if (!licencia) return "sin_licencia";
  const datos = licencia.datos_solicitud as
    | { estado_pago?: string }
    | null
    | undefined;
  return datos?.estado_pago || "no_aplica";
}

export function etiquetaPeriodoLicencia(
  periodo: string,
  frecuencia: "anual" | "mensual",
): string {
  if (frecuencia === "anual" && /^\d{4}$/.test(periodo)) {
    return `Año ${periodo}`;
  }
  if (/^\d{4}-\d{2}$/.test(periodo)) {
    const [y, m] = periodo.split("-");
    return `${m}/${y}`;
  }
  return periodo;
}

export function licenciaFrecuenciaPago(
  licencia: Licencia | null | undefined,
): "anual" | "mensual" {
  const datos = licencia?.datos_solicitud as
    | { frecuencia_pago?: string }
    | null
    | undefined;
  return datos?.frecuencia_pago === "mensual" ? "mensual" : "anual";
}

export function licenciaMontoPendiente(
  licencia: Licencia | null | undefined,
): number {
  if (!licencia) return 0;
  const datos = licencia.datos_solicitud as
    | { precio_anual?: number; precio_mensual?: number; frecuencia_pago?: string }
    | null
    | undefined;
  if (licenciaFrecuenciaPago(licencia) === "mensual") {
    return Number(datos?.precio_mensual ?? 0);
  }
  return Number(datos?.precio_anual ?? 0);
}

const ESTADOS_CON_PAGO_PENDIENTE = new Set(["pendiente", "activa"]);

/** Pago federativo pendiente (antes o después de la aprobación administrativa). */
export function licenciaTienePagoPendiente(
  licencia: Licencia | null | undefined,
): boolean {
  if (!licencia) return false;
  const estado = (licencia.estado || "").toLowerCase();
  if (!ESTADOS_CON_PAGO_PENDIENTE.has(estado)) return false;
  if (licenciaEstadoPago(licencia) !== "pendiente") return false;
  return licenciaMontoPendiente(licencia) > 0;
}

export function licenciaRequierePago(licencia: Licencia | null | undefined): boolean {
  return licenciaTienePagoPendiente(licencia);
}

export function licenciaPagoEnRevision(
  licencia: Licencia | null | undefined,
): boolean {
  if (!licencia) return false;
  if ((licencia.estado || "").toLowerCase() !== "pendiente") return false;
  return licenciaEstadoPago(licencia) === "pagado";
}

export function etiquetaEstadoPagoLicencia(
  licencia: Licencia | null | undefined,
): string {
  const estado = licenciaEstadoPago(licencia);
  if (estado === "pagado") return "Pago acreditado";
  if (estado === "pendiente" && licenciaMontoPendiente(licencia) > 0) {
    return "Pago pendiente";
  }
  if (estado === "no_aplica") return "Sin costo";
  return "Sin registro de pago";
}

export function formatMontoLicenciaArs(monto: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(monto);
}
