export type FiscalRango = "Local" | "Regional" | "Provincial" | "Nacional";

const NIVEL_FISCAL: Record<FiscalRango, number> = {
  Local: 1,
  Regional: 2,
  Provincial: 3,
  Nacional: 4,
};

const MINIMO_FISCAL_POR_ALCANCE: Record<string, number> = {
  Privado: 1,
  Local: 1,
  Regional: 2,
  Provincial: 3,
  Nacional: 4,
};

const ETIQUETAS_RANGO: FiscalRango[] = [
  "Local",
  "Regional",
  "Provincial",
  "Nacional",
];

export function nivelFiscalRango(rango?: string | null): number {
  const key = String(rango || "Local").trim() as FiscalRango;
  return NIVEL_FISCAL[key] ?? 1;
}

export function minimoFiscalParaAlcanceTorneo(alcance?: string | null): number {
  const a = String(alcance || "Local").trim();
  return MINIMO_FISCAL_POR_ALCANCE[a] ?? 1;
}

export function etiquetaRangoMinimoFiscal(alcance?: string | null): string {
  const n = minimoFiscalParaAlcanceTorneo(alcance);
  return ETIQUETAS_RANGO[n - 1] ?? "Nacional";
}

export function fiscalHabilitadoParaTorneo(
  alcanceTorneo?: string | null,
  rangoFiscal?: string | null,
): boolean {
  return (
    nivelFiscalRango(rangoFiscal) >= minimoFiscalParaAlcanceTorneo(alcanceTorneo)
  );
}

export function mensajeFiscalInhabilParaTorneo(
  alcanceTorneo?: string | null,
  rangoFiscal?: string | null,
): string {
  const minLabel = etiquetaRangoMinimoFiscal(alcanceTorneo);
  const alcance = String(alcanceTorneo || "Local").trim();
  const rango = String(rangoFiscal || "Local").trim();
  return `Torneo de alcance ${alcance}: el fiscal debe ser ${minLabel} o superior. Rango actual: ${rango}.`;
}
