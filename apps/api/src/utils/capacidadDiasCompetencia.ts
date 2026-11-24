import { getCapacidadesZonasPorReglamento } from "./capacidadesZonas";
import { sugerirCanchasYHoras } from "./programadorReglas";

function partidosEnZona(cap: number): number {
  if (cap <= 2) return 1;
  if (cap === 3) return 3;
  return 5;
}

function clasificadosEstimados(cap: number): number {
  if (cap >= 4) return 3;
  if (cap === 3) return 2;
  return 1;
}

/** Estimación conservadora de partidos (zonas + llave) para avisos TOR-51/TOR-4. */
export function estimarPartidosZonasYLlave(
  parejas: number,
  reglamento?: string | null,
): number {
  if (parejas < 4) return 0;
  const caps = getCapacidadesZonasPorReglamento(parejas, reglamento);
  const partidosZona = caps.reduce((sum, cap) => sum + partidosEnZona(cap), 0);
  const clasificados = caps.reduce(
    (sum, cap) => sum + clasificadosEstimados(cap),
    0,
  );
  const partidosLlave = Math.max(0, clasificados - 1);
  return partidosZona + partidosLlave;
}

export interface EvaluacionCapacidadDiasCompetencia {
  ok: boolean;
  mensaje?: string;
  partidosEstimados: number;
  jornadasSeleccionadas: number;
  jornadasMinimasSugeridas: number;
}

export function evaluarCapacidadDiasCompetencia(input: {
  parejas: number;
  reglamento?: string | null;
  duracionMinutos: number;
  diasSeleccionados: number;
  canchasDisponibles: number;
}): EvaluacionCapacidadDiasCompetencia {
  const jornadas = Math.max(0, Math.floor(input.diasSeleccionados));
  const partidos = estimarPartidosZonasYLlave(input.parejas, input.reglamento);

  if (jornadas === 0 || partidos === 0) {
    return {
      ok: jornadas > 0,
      partidosEstimados: partidos,
      jornadasSeleccionadas: jornadas,
      jornadasMinimasSugeridas: 0,
    };
  }

  const sugActual = sugerirCanchasYHoras({
    partidos,
    duracionMinutos: input.duracionMinutos,
    jornadas: Math.min(4, jornadas),
    canchasActuales: input.canchasDisponibles,
  });

  const canchas = Math.max(1, input.canchasDisponibles || 1);
  let jornadasMin = jornadas;
  for (let j = jornadas; j <= 4; j++) {
    const sug = sugerirCanchasYHoras({
      partidos,
      duracionMinutos: input.duracionMinutos,
      jornadas: j,
      canchasActuales: canchas,
    });
    if (sug.canchas <= canchas && !/adelantá el inicio|extendé el cierre|sumá \d+ cancha/i.test(sug.mensaje)) {
      jornadasMin = j;
      break;
    }
    jornadasMin = j;
  }

  const insuficiente =
    jornadasMin > jornadas ||
    sugActual.canchas > canchas ||
    /adelantá el inicio|extendé el cierre|pasá a \d jornadas|sumá \d+ cancha/i.test(
      sugActual.mensaje,
    );

  if (!insuficiente) {
    return {
      ok: true,
      partidosEstimados: partidos,
      jornadasSeleccionadas: jornadas,
      jornadasMinimasSugeridas: jornadas,
    };
  }

  const mensaje =
    jornadasMin > jornadas
      ? `Con ~${partidos} partidos estimados, ${jornadas} día${jornadas === 1 ? "" : "s"} de competencia y ${canchas} cancha${canchas === 1 ? "" : "s"} puede no alcanzar. Marcá al menos ${jornadasMin} día${jornadasMin === 1 ? "" : "s"} o sumá canchas en el Paso 1.`
      : `Con ~${partidos} partidos estimados la programación puede quedar ajustada: ${sugActual.mensaje}`;

  return {
    ok: false,
    mensaje,
    partidosEstimados: partidos,
    jornadasSeleccionadas: jornadas,
    jornadasMinimasSugeridas: jornadasMin,
  };
}