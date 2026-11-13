/** Alcance persistido en `rankings.alcance` según el torneo que otorga puntos. */
export function alcanceRankingDesdeTorneo(alcance?: string | null): string {
  const valor = String(alcance || "Provincial").trim();
  if (valor === "Local" || valor === "Privado") return "Local";
  if (valor === "Nacional") return "Provincial";
  if (valor === "Regional") return "Provincial";
  return valor;
}

export type ConfigPuntosTorneo = {
  puntos_activados?: boolean;
  puntos_zona?: number;
  puntos_32avos?: number;
  puntos_16avos?: number;
  puntos_octavos?: number;
  puntos_cuartos?: number;
  puntos_semis?: number;
  puntos_campeon?: number;
  puntos_final?: number;
};

/** Todo torneo competitivo del wizard tiene ranking vinculado por alcance/nivel. */
export function torneoVinculaRanking(alcance?: string | null): boolean {
  const valor = String(alcance || "").trim().toLowerCase();
  if (!valor) return true;
  return valor !== "clasificatorio";
}

export function configuracionPuntosInicial(): ConfigPuntosTorneo {
  return {
    puntos_activados: true,
    puntos_campeon: 1000,
    puntos_final: 600,
    puntos_semis: 360,
    puntos_cuartos: 180,
    puntos_octavos: 90,
    puntos_16avos: 45,
    puntos_32avos: 0,
    puntos_zona: 0,
  };
}

export function inferirPuntosActivados(
  config: ConfigPuntosTorneo | Record<string, unknown> | null | undefined,
  alcance?: string | null,
): boolean {
  if (
    config &&
    typeof config === "object" &&
    typeof config.puntos_activados === "boolean"
  ) {
    return config.puntos_activados;
  }
  return torneoVinculaRanking(alcance);
}

export function tablaPuntosDesdeConfig(
  config: ConfigPuntosTorneo | null | undefined,
): Record<string, { ganador: number; perdedor: number }> | null {
  if (!config?.puntos_activados) return null;
  return {
    "32AVOS": { ganador: config.puntos_32avos || 0, perdedor: 0 },
    "16AVOS": {
      ganador: config.puntos_16avos || 0,
      perdedor: config.puntos_zona || 0,
    },
    OCTAVOS: {
      ganador: config.puntos_octavos || 0,
      perdedor: config.puntos_16avos || 0,
    },
    CUARTOS: {
      ganador: config.puntos_cuartos || 0,
      perdedor: config.puntos_octavos || 0,
    },
    SEMIS: {
      ganador: config.puntos_semis || 0,
      perdedor: config.puntos_cuartos || 0,
    },
    FINAL: {
      ganador: config.puntos_campeon || 0,
      perdedor: config.puntos_final || 0,
    },
  };
}
