import { fechaHoyArgentina } from "./fechaArgentina";

export type LicenciaVigenciaModo = "fecha_fija" | "meses_desde_emision";
export type LicenciaFrecuenciaPago = "anual" | "mensual";

export interface LicenciaOrganizacionConfig {
  precioAnual: number;
  vigenciaModo: LicenciaVigenciaModo;
  vencimientoMes: number | null;
  vencimientoDia: number | null;
  vigenciaMeses: number;
  /** Nombre visible del carné digital. */
  nombreCarne: string | null;
  /** anual (FAP default) o mensual (asociaciones provinciales). */
  frecuenciaPago: LicenciaFrecuenciaPago;
  precioMensual: number;
  /** Día del mes (1-28) de cobro/vencimiento cuando frecuencia = mensual. */
  diaCobro: number | null;
  origen: "asociacion" | "federacion" | "sistema";
}

export const LICENCIA_CONFIG_DEFAULT: LicenciaOrganizacionConfig = {
  precioAnual: 0,
  vigenciaModo: "fecha_fija",
  vencimientoMes: 12,
  vencimientoDia: 31,
  vigenciaMeses: 12,
  nombreCarne: "Licencia Federativa",
  frecuenciaPago: "anual",
  precioMensual: 0,
  diaCobro: 1,
  origen: "sistema",
};

type RowConfig = {
  licencia_precio_anual?: number | string | null;
  licencia_vigencia_modo?: string | null;
  licencia_vencimiento_mes?: number | null;
  licencia_vencimiento_dia?: number | null;
  licencia_vigencia_meses?: number | null;
  licencia_nombre_carne?: string | null;
  licencia_frecuencia_pago?: string | null;
  licencia_precio_mensual?: number | string | null;
  licencia_dia_cobro?: number | null;
};

function clampDiaCobro(v: number | null | undefined): number | null {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Math.min(28, Math.max(1, Number(v)));
}

export function mapRowToLicenciaConfig(
  row: RowConfig | null | undefined,
  origen: LicenciaOrganizacionConfig["origen"],
): LicenciaOrganizacionConfig {
  if (!row) return { ...LICENCIA_CONFIG_DEFAULT, origen };

  const modo =
    row.licencia_vigencia_modo === "meses_desde_emision"
      ? "meses_desde_emision"
      : "fecha_fija";

  const frecuencia: LicenciaFrecuenciaPago =
    row.licencia_frecuencia_pago === "mensual" ? "mensual" : "anual";

  return {
    precioAnual: Number(row.licencia_precio_anual ?? 0),
    vigenciaModo: modo,
    vencimientoMes: row.licencia_vencimiento_mes ?? null,
    vencimientoDia: row.licencia_vencimiento_dia ?? null,
    vigenciaMeses: Number(row.licencia_vigencia_meses ?? 12),
    nombreCarne:
      typeof row.licencia_nombre_carne === "string" &&
      row.licencia_nombre_carne.trim()
        ? row.licencia_nombre_carne.trim()
        : LICENCIA_CONFIG_DEFAULT.nombreCarne,
    frecuenciaPago: frecuencia,
    precioMensual: Number(row.licencia_precio_mensual ?? 0),
    diaCobro: clampDiaCobro(row.licencia_dia_cobro) ?? 1,
    origen,
  };
}

export function mergeLicenciaConfig(
  federacion: RowConfig | null | undefined,
  asociacion?: RowConfig | null,
): LicenciaOrganizacionConfig {
  const base = mapRowToLicenciaConfig(federacion, "federacion");

  if (!asociacion) return base;

  const tieneOverride =
    asociacion.licencia_precio_anual != null ||
    asociacion.licencia_vigencia_modo != null ||
    asociacion.licencia_vencimiento_mes != null ||
    asociacion.licencia_vencimiento_dia != null ||
    asociacion.licencia_vigencia_meses != null ||
    asociacion.licencia_nombre_carne != null ||
    asociacion.licencia_frecuencia_pago != null ||
    asociacion.licencia_precio_mensual != null ||
    asociacion.licencia_dia_cobro != null;

  if (!tieneOverride) return base;

  return {
    precioAnual:
      asociacion.licencia_precio_anual != null
        ? Number(asociacion.licencia_precio_anual)
        : base.precioAnual,
    vigenciaModo:
      asociacion.licencia_vigencia_modo === "meses_desde_emision"
        ? "meses_desde_emision"
        : asociacion.licencia_vigencia_modo === "fecha_fija"
          ? "fecha_fija"
          : base.vigenciaModo,
    vencimientoMes:
      asociacion.licencia_vencimiento_mes ?? base.vencimientoMes,
    vencimientoDia:
      asociacion.licencia_vencimiento_dia ?? base.vencimientoDia,
    vigenciaMeses:
      asociacion.licencia_vigencia_meses != null
        ? Number(asociacion.licencia_vigencia_meses)
        : base.vigenciaMeses,
    nombreCarne:
      typeof asociacion.licencia_nombre_carne === "string" &&
      asociacion.licencia_nombre_carne.trim()
        ? asociacion.licencia_nombre_carne.trim()
        : base.nombreCarne,
    frecuenciaPago:
      asociacion.licencia_frecuencia_pago === "mensual"
        ? "mensual"
        : asociacion.licencia_frecuencia_pago === "anual"
          ? "anual"
          : base.frecuenciaPago,
    precioMensual:
      asociacion.licencia_precio_mensual != null
        ? Number(asociacion.licencia_precio_mensual)
        : base.precioMensual,
    diaCobro:
      clampDiaCobro(asociacion.licencia_dia_cobro) ?? base.diaCobro,
    origen: "asociacion",
  };
}

/**
 * Calcula vencimiento tras un pago mensual: cubre hasta el dia_cobro
 * del mes siguiente al período pagado.
 */
function isoCalendario(year: number, month: number, day: number): string {
  const fecha = new Date(Date.UTC(year, month - 1, day));
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const d = String(fecha.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function calcularVencimientoTrasPagoMensual(
  diaCobro: number | null | undefined,
  fechaPago: Date = new Date(),
): string {
  const dia = clampDiaCobro(diaCobro) ?? 1;
  const [yearStr, monthStr, dayStr] = fechaHoyArgentina(fechaPago).split("-");
  let year = Number(yearStr);
  let month = Number(monthStr);
  if (Number(dayStr) >= dia) month += 1;
  month += 1;
  while (month > 12) {
    month -= 12;
    year += 1;
  }
  return isoCalendario(year, month, dia);
}

/** Calcula la fecha de vencimiento según la config de la organización. */
export function calcularFechaVencimientoLicencia(
  config: LicenciaOrganizacionConfig,
  fechaReferencia: Date = new Date(),
): string {
  if (config.frecuenciaPago === "mensual") {
    return calcularVencimientoTrasPagoMensual(
      config.diaCobro,
      fechaReferencia,
    );
  }

  const hoy = fechaHoyArgentina(fechaReferencia);

  if (config.vigenciaModo === "meses_desde_emision") {
    const [yearStr, monthStr, dayStr] = hoy.split("-");
    let year = Number(yearStr);
    let month = Number(monthStr) + config.vigenciaMeses;
    while (month > 12) {
      month -= 12;
      year += 1;
    }
    return isoCalendario(year, month, Number(dayStr));
  }

  const mes = config.vencimientoMes ?? 12;
  const dia = config.vencimientoDia ?? 31;
  const year = Number(hoy.slice(0, 4));
  let candidata = isoCalendario(year, mes, dia);
  if (hoy > candidata) {
    candidata = isoCalendario(year + 1, mes, dia);
  }
  return candidata;
}

export function descripcionVigenciaLicencia(
  config: LicenciaOrganizacionConfig,
): string {
  if (config.frecuenciaPago === "mensual") {
    const dia = config.diaCobro ?? 1;
    return `Mensual · cobro día ${dia} de cada mes`;
  }

  if (config.vigenciaModo === "meses_desde_emision") {
    return `${config.vigenciaMeses} meses desde la emisión`;
  }

  const mes = config.vencimientoMes ?? 12;
  const dia = config.vencimientoDia ?? 31;
  const meses = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  return `${dia}/${mes} (${meses[mes - 1]}) de cada año`;
}

/** Período YYYY-MM a partir de una fecha. */
export function periodoDesdeFecha(fecha: Date = new Date()): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
