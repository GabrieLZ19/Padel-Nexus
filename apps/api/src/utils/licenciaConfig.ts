export type LicenciaVigenciaModo = "fecha_fija" | "meses_desde_emision";

export interface LicenciaOrganizacionConfig {
  precioAnual: number;
  vigenciaModo: LicenciaVigenciaModo;
  vencimientoMes: number | null;
  vencimientoDia: number | null;
  vigenciaMeses: number;
  origen: "asociacion" | "federacion" | "sistema";
}

export const LICENCIA_CONFIG_DEFAULT: LicenciaOrganizacionConfig = {
  precioAnual: 0,
  vigenciaModo: "fecha_fija",
  vencimientoMes: 12,
  vencimientoDia: 31,
  vigenciaMeses: 12,
  origen: "sistema",
};

type RowConfig = {
  licencia_precio_anual?: number | string | null;
  licencia_vigencia_modo?: string | null;
  licencia_vencimiento_mes?: number | null;
  licencia_vencimiento_dia?: number | null;
  licencia_vigencia_meses?: number | null;
};

export function mapRowToLicenciaConfig(
  row: RowConfig | null | undefined,
  origen: LicenciaOrganizacionConfig["origen"],
): LicenciaOrganizacionConfig {
  if (!row) return { ...LICENCIA_CONFIG_DEFAULT, origen };

  const modo =
    row.licencia_vigencia_modo === "meses_desde_emision"
      ? "meses_desde_emision"
      : "fecha_fija";

  return {
    precioAnual: Number(row.licencia_precio_anual ?? 0),
    vigenciaModo: modo,
    vencimientoMes: row.licencia_vencimiento_mes ?? null,
    vencimientoDia: row.licencia_vencimiento_dia ?? null,
    vigenciaMeses: Number(row.licencia_vigencia_meses ?? 12),
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
    asociacion.licencia_vigencia_meses != null;

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
    origen: "asociacion",
  };
}

/** Calcula la fecha de vencimiento según la config de la organización. */
export function calcularFechaVencimientoLicencia(
  config: LicenciaOrganizacionConfig,
  fechaReferencia: Date = new Date(),
): string {
  if (config.vigenciaModo === "meses_desde_emision") {
    const venc = new Date(fechaReferencia);
    venc.setMonth(venc.getMonth() + config.vigenciaMeses);
    return venc.toISOString().split("T")[0];
  }

  const mes = config.vencimientoMes ?? 12;
  const dia = config.vencimientoDia ?? 31;
  const year = fechaReferencia.getFullYear();

  const candidata = new Date(year, mes - 1, dia);
  if (fechaReferencia > candidata) {
    candidata.setFullYear(year + 1);
  }

  return candidata.toISOString().split("T")[0];
}

export function descripcionVigenciaLicencia(
  config: LicenciaOrganizacionConfig,
): string {
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
