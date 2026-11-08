import { FAP_ESTADOS_TORNEO } from "../constants/fap";

export interface FilaTorneoTablero {
  id?: string;
  alcance?: string | null;
  estado?: string | null;
  nivel?: string | null;
  categoria?: string | null;
}

export function estadosActivosTablero(): Set<string> {
  return new Set<string>([
    FAP_ESTADOS_TORNEO.INSCRIPCION,
    FAP_ESTADOS_TORNEO.CERRADO,
    FAP_ESTADOS_TORNEO.PROGRAMADO,
    FAP_ESTADOS_TORNEO.EN_CURSO,
  ]);
}

export function metricasProvincialesTablero(
  filas: FilaTorneoTablero[],
  estadosActivos: Set<string> = estadosActivosTablero(),
) {
  const provincialesCircuito: FilaTorneoTablero[] = [];
  let clasificatoriosTotal = 0;
  const nacionales: FilaTorneoTablero[] = [];

  for (const torneo of filas) {
    const alcance = String(torneo.alcance || "");
    if (alcance === "Provincial" || alcance === "Regional") {
      provincialesCircuito.push(torneo);
    }
    if (alcance === "Provincial") clasificatoriosTotal += 1;
    if (alcance === "Nacional") nacionales.push(torneo);
  }

  const provincialesActivos = provincialesCircuito.filter((torneo) =>
    estadosActivos.has(String(torneo.estado || "")),
  ).length;

  return {
    provinciales_total: provincialesCircuito.length,
    provinciales_activos: provincialesActivos,
    clasificatorios_total: clasificatoriosTotal,
    nacionales_total: nacionales.length,
    ultimos_provinciales: provincialesCircuito.slice(0, 5),
    ultimos_nacionales: nacionales.slice(0, 5),
    indice_torneo: filas.map((torneo) => ({
      id: torneo.id,
      nivel: torneo.nivel,
      categoria: torneo.categoria,
      alcance: torneo.alcance,
    })),
  };
}
