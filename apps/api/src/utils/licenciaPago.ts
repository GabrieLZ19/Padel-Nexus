import type { LicenciaOrganizacionConfig } from "./licenciaConfig";

export type DatosSolicitudLicencia = Record<string, unknown>;

export function montoLicenciaDesdeSolicitud(
  datos: DatosSolicitudLicencia,
  config?: Pick<
    LicenciaOrganizacionConfig,
    "frecuenciaPago" | "precioAnual" | "precioMensual"
  >,
): number {
  const frecuencia =
    datos.frecuencia_pago === "mensual" || config?.frecuenciaPago === "mensual"
      ? "mensual"
      : "anual";

  if (frecuencia === "mensual") {
    const mensual = Number(datos.precio_mensual ?? config?.precioMensual ?? 0);
    if (mensual > 0) return mensual;
  }

  return Number(datos.precio_anual ?? config?.precioAnual ?? 0);
}

export function datosTransferenciaLicenciaEnv() {
  return {
    alias: process.env.LICENCIA_PAGO_ALIAS?.trim() || null,
    cbu: process.env.LICENCIA_PAGO_CBU?.trim() || null,
    titular:
      process.env.LICENCIA_PAGO_TITULAR?.trim() ||
      "Federación Argentina de Pádel",
  };
}

export function permitirMockMercadoPagoLicencia(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.LICENCIA_SIMULAR_MP === "true"
  );
}

export function textoInstruccionesPagoLicencia(params: {
  monto: number;
  nroLicencia: string;
  alias?: string | null;
  cbu?: string | null;
  titular?: string | null;
}): string {
  const montoTxt = `$${params.monto.toLocaleString("es-AR")} ARS`;
  const lineas = [
    `Transferí ${montoTxt} por el trámite de licencia FAP.`,
    `En el concepto o referencia indicá: ${params.nroLicencia}.`,
  ];

  if (params.alias) {
    lineas.push(`Alias: ${params.alias}.`);
  }
  if (params.cbu) {
    lineas.push(`CBU: ${params.cbu}.`);
  }
  if (params.titular) {
    lineas.push(`Titular: ${params.titular}.`);
  }

  lineas.push(
    "Enviá el comprobante a tu federación o asociación provincial. La acreditación puede demorar hasta 48 h hábiles.",
  );

  return lineas.join(" ");
}
