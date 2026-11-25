const ORDINALES: Record<string, string> = {
  primera: "1ª",
  segunda: "2ª",
  tercera: "3ª",
  cuarta: "4ª",
  quinta: "5ª",
  sexta: "6ª",
  septima: "7ª",
  octava: "8ª",
};

export function parseNivelFapFicha(nivel: string): {
  sexo: "masculino" | "femenino";
  categoria_padel: string;
} {
  const t = nivel.trim().toLowerCase();
  const sexo: "masculino" | "femenino" = t.startsWith("damas")
    ? "femenino"
    : "masculino";

  if (!t || t === "-" || t.includes("sin categorizar")) {
    return { sexo, categoria_padel: "Inicial" };
  }

  for (const [palabra, categoria] of Object.entries(ORDINALES)) {
    if (t.includes(palabra)) {
      return { sexo, categoria_padel: categoria };
    }
  }

  return { sexo, categoria_padel: "Inicial" };
}

export function normalizarNroLicenciaFap(raw: string): string | null {
  const s = raw.replace(/\s+/g, " ").trim();
  const match = s.match(/(\d{4,})/);
  return match ? match[1] : null;
}

export function emailPlaceholderPadronFap(dni: string): string {
  return `preinscripto+${dni}@padelnexus.local`;
}

export function lugarResidenciaDesdePadronFap(
  ciudad: string,
  provincia: string,
): string {
  const c = ciudad.trim();
  const p = provincia.trim();
  if (c && p) return `${c}, ${p}`;
  return c || p || "A completar";
}