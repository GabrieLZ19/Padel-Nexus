export type ReglamentoPersistido = "FAP" | "APA" | "Amateur";

/**
 * Reglamento que se guarda en el torneo.
 * Conserva el reglamento elegido (FAP, APA o Amateur) y usa FAP como fallback por defecto.
 */
export function resolverReglamentoPersistido(input: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): ReglamentoPersistido {
  const raw = String(input.reglamento || input.asociacion || "FAP").trim();
  if (raw === "APA" || raw === "Amateur") return raw;
  return "FAP";
}
