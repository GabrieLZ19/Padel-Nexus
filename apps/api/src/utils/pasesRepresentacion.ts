export function validarPase(input: {
  origenId: string | null | undefined;
  destinoId: string | null | undefined;
  motivo: string | null | undefined;
}): string | null {
  if (!input.origenId) {
    return "No tenés una asociación de origen para pedir el pase.";
  }
  if (!input.destinoId) return "Elegí la asociación de destino.";
  if (input.origenId === input.destinoId) {
    return "El pase tiene que ser a otra asociación.";
  }
  if (!input.motivo?.trim()) return "El motivo es obligatorio.";
  return null;
}

export function esAlcanceClasificatorio(alcance: string | null | undefined): boolean {
  return String(alcance || "").trim().toLowerCase() === "clasificatorio";
}

export type AlcanceTorneo =
  | "Nacional"
  | "Provincial"
  | "Regional"
  | "Local"
  | "Privado"
  | "Clasificatorio";

export function normalizarAlcanceTorneo(
  alcance?: string | null,
): AlcanceTorneo {
  if (!alcance) return "Provincial";
  const val = String(alcance).trim();
  if (/nacional/i.test(val)) return "Nacional";
  if (/clasificatorio/i.test(val)) return "Clasificatorio";
  if (/regional/i.test(val)) return "Regional";
  if (/^privado$/i.test(val)) return "Privado";
  if (/local/i.test(val)) return "Local";
  if (/provincial/i.test(val)) return "Provincial";
  return "Provincial";
}
