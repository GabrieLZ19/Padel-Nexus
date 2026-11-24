/** Rama del ranking público (valores alineados con `perfiles.sexo` y la API). */
export type RamaRankingFront = "masculino" | "femenino";

export const OPCIONES_RAMA_RANKING_PUBLICO: ReadonlyArray<{
  value: RamaRankingFront;
  label: string;
}> = [
  { value: "masculino", label: "Caballeros" },
  { value: "femenino", label: "Damas" },
];

/** Normaliza texto de torneo o perfil a la rama usada en queries de ranking. */
export function normalizarRamaRanking(
  input?: string | null,
): RamaRankingFront | null {
  if (!input) return null;
  const v = input.trim().toLowerCase();
  if (
    ["masculino", "caballeros", "hombres", "m", "male"].includes(v) ||
    v.startsWith("masculin")
  ) {
    return "masculino";
  }
  if (
    ["femenino", "damas", "mujeres", "f", "female"].includes(v) ||
    v.startsWith("femenin") ||
    v.startsWith("dama")
  ) {
    return "femenino";
  }
  return null;
}

export function etiquetaRamaRankingPublico(rama: RamaRankingFront): string {
  return rama === "femenino" ? "Damas" : "Caballeros";
}

/** Valor por defecto cuando no hay torneo en contexto (perfil o Caballeros). */
export function ramaInicialRankingPublico(
  sexoPerfil?: string | null,
): RamaRankingFront {
  return normalizarRamaRanking(sexoPerfil) ?? "masculino";
}