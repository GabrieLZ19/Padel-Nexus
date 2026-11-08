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
