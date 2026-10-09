export type ReglamentoPersistido = "FAP" | "APA" | "Amateur";

/**
 * Reglamento que se guarda en el torneo.
 * Nacional siempre queda en FAP. Provincial o regional conservan APA o Amateur.
 */
export function resolverReglamentoPersistido(input: {
  alcance?: string | null;
  reglamento?: string | null;
  asociacion?: string | null;
}): ReglamentoPersistido {
  if (/nacional/i.test(String(input.alcance || "").trim())) return "FAP";
  const raw = String(input.reglamento || input.asociacion || "FAP").trim();
  if (raw === "APA" || raw === "Amateur") return raw;
  return "FAP";
}
