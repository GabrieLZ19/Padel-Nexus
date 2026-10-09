export type InstanciaProvincia = "OCTAVOS" | "CUARTOS" | "SEMIS" | "FINAL";

export type ConfigPuntosProvincia = {
  desde: InstanciaProvincia;
  campeon: number;
  finalista: number;
  semis: number;
  cuartos: number;
  octavos: number;
};

/** Valores del circuito nacional cuando el torneo no guardó otra tabla. */
export const CONFIG_PUNTOS_PROVINCIA_DEFAULT: ConfigPuntosProvincia = {
  desde: "OCTAVOS",
  campeon: 8,
  finalista: 6,
  semis: 4,
  cuartos: 2,
  octavos: 1,
};

const ORDEN_INSTANCIA: InstanciaProvincia[] = [
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
];

function instanciaDeRonda(ronda: string): InstanciaProvincia | null {
  const u = ronda.trim().toUpperCase();
  if (u === "FINAL") return "FINAL";
  if (u.startsWith("SEMI")) return "SEMIS";
  if (u === "CUARTOS") return "CUARTOS";
  if (u === "OCTAVOS") return "OCTAVOS";
  return null;
}

function numero(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Lee la tabla guardada en `torneos.configuracion_puntos`. */
export function leerConfigPuntosProvincia(raw: unknown): ConfigPuntosProvincia {
  const base = CONFIG_PUNTOS_PROVINCIA_DEFAULT;
  if (!raw || typeof raw !== "object") return { ...base };
  const raiz = raw as Record<string, unknown>;
  const bloque =
    raiz.puntos_provincia && typeof raiz.puntos_provincia === "object"
      ? (raiz.puntos_provincia as Record<string, unknown>)
      : null;
  if (!bloque) return { ...base };
  const desde = String(bloque.desde || "").toUpperCase();
  return {
    desde: ORDEN_INSTANCIA.includes(desde as InstanciaProvincia)
      ? (desde as InstanciaProvincia)
      : base.desde,
    campeon: numero(bloque.campeon, base.campeon),
    finalista: numero(bloque.finalista, base.finalista),
    semis: numero(bloque.semis, base.semis),
    cuartos: numero(bloque.cuartos, base.cuartos),
    octavos: numero(bloque.octavos, base.octavos),
  };
}

/**
 * Puntos de provincia en torneos de alcance nacional.
 * Por defecto se suman desde octavos. Dieciseisavos y treintaidosavos no suman.
 */
export function puntosDeRondaProvincial(
  ronda: string,
  lado: "ganador" | "perdedor",
  config: ConfigPuntosProvincia = CONFIG_PUNTOS_PROVINCIA_DEFAULT,
): number {
  const instancia = instanciaDeRonda(ronda);
  if (!instancia) return 0;
  if (ORDEN_INSTANCIA.indexOf(instancia) < ORDEN_INSTANCIA.indexOf(config.desde)) {
    return 0;
  }
  if (instancia === "FINAL") {
    return lado === "ganador" ? config.campeon : config.finalista;
  }
  if (instancia === "SEMIS") return lado === "perdedor" ? config.semis : 0;
  if (instancia === "CUARTOS") return lado === "perdedor" ? config.cuartos : 0;
  return lado === "perdedor" ? config.octavos : 0;
}

export type ResultadoInstancia = {
  ronda: string;
  ganadorId: string;
  perdedorId: string | null;
};

/**
 * Cada pareja se queda con los puntos de su mejor instancia.
 * El campeón no suma también los de las rondas anteriores.
 */
export function puntosInscripcionPorMejorInstancia(
  partidos: ResultadoInstancia[],
  config: ConfigPuntosProvincia = CONFIG_PUNTOS_PROVINCIA_DEFAULT,
): Map<string, number> {
  const peso = (ronda: string) => {
    const u = ronda.trim().toUpperCase();
    if (u === "FINAL") return 5;
    if (u.startsWith("SEMI")) return 4;
    if (u === "CUARTOS") return 3;
    if (u === "OCTAVOS") return 2;
    return 0;
  };

  const puntos = new Map<string, number>();
  const mejor = new Map<string, number>();

  const aplicar = (id: string | null, ronda: string, pts: number) => {
    if (!id || pts <= 0) return;
    const rank = peso(ronda);
    if (rank === 0) return;
    const previo = mejor.get(id) || 0;
    if (rank < previo) return;
    if (rank > previo || pts > (puntos.get(id) || 0)) {
      mejor.set(id, rank);
      puntos.set(id, pts);
    }
  };

  for (const partido of partidos) {
    aplicar(
      partido.ganadorId,
      partido.ronda,
      puntosDeRondaProvincial(partido.ronda, "ganador", config),
    );
    aplicar(
      partido.perdedorId,
      partido.ronda,
      puntosDeRondaProvincial(partido.ronda, "perdedor", config),
    );
  }

  return puntos;
}

export type LadosProvincia = {
  provinciaA: string;
  provinciaB: string;
};

/**
 * Suma los puntos de cada pareja a su provincia.
 * Si los dos jugadores son de la misma provincia, suma una vez.
 * Si son de provincias distintas, reparte la mitad a cada una.
 */
export function sumarPuntosPorProvincia(
  puntosPorInscripcion: Map<string, number>,
  provincias: Map<string, LadosProvincia>,
): Array<{ provincia: string; puntos: number; parejas: number }> {
  const agg = new Map<string, { puntos: number; parejas: number }>();

  for (const [inscripcionId, pts] of puntosPorInscripcion) {
    if (pts <= 0) continue;
    const lados = provincias.get(inscripcionId);
    if (!lados) continue;
    if (lados.provinciaA === lados.provinciaB) {
      const cur = agg.get(lados.provinciaA) || { puntos: 0, parejas: 0 };
      cur.puntos += pts;
      cur.parejas += 1;
      agg.set(lados.provinciaA, cur);
    } else {
      for (const provincia of [lados.provinciaA, lados.provinciaB]) {
        const cur = agg.get(provincia) || { puntos: 0, parejas: 0 };
        cur.puntos += pts / 2;
        cur.parejas += 0.5;
        agg.set(provincia, cur);
      }
    }
  }

  return [...agg.entries()]
    .map(([provincia, valor]) => ({
      provincia,
      puntos: Math.round(valor.puntos * 10) / 10,
      parejas: Math.round(valor.parejas * 10) / 10,
    }))
    .sort((a, b) => b.puntos - a.puntos || a.provincia.localeCompare(b.provincia));
}
