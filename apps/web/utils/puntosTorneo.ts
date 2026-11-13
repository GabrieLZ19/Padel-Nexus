export type ConfigPuntosTorneoUi = {
  puntos_activados?: boolean;
};

export function torneoVinculaRanking(alcance?: string | null): boolean {
  const valor = String(alcance || "").trim().toLowerCase();
  if (!valor) return true;
  return valor !== "clasificatorio";
}

export function inferirPuntosActivados(
  config: ConfigPuntosTorneoUi | null | undefined,
  alcance?: string | null,
): boolean {
  if (config && typeof config.puntos_activados === "boolean") {
    return config.puntos_activados;
  }
  return torneoVinculaRanking(alcance);
}
