/** Aviso de capacidad en días (TOR-51/TOR-4). Lógica alineada con `apps/api/src/utils/capacidadDiasCompetencia.ts`. */

function sugerirCanchasYHoras(input: {
  partidos: number;
  duracionMinutos: number;
  jornadas: number;
  canchasActuales?: number;
}): { canchas: number; horas: number; mensaje: string } {
  const partidos = Math.max(0, Math.floor(input.partidos));
  const duracion = Math.max(30, input.duracionMinutos || 90);
  const jornadas = Math.min(4, Math.max(1, Math.floor(input.jornadas) || 1));
  const canchasActuales = Math.max(0, Math.floor(input.canchasActuales ?? 0));
  if (partidos === 0) {
    return {
      canchas: 0,
      horas: 0,
      mensaje: "Todavía no hay partidos para estimar canchas y horas.",
    };
  }
  const ocupacion = partidos * duracion;
  const ventanaMin = 27 * 60 + (jornadas - 1) * 16 * 60;
  const canchas = Math.max(1, Math.ceil(ocupacion / ventanaMin));
  const horasPorCancha = Math.max(1, Math.ceil(ocupacion / canchas / 60));
  const ventanaHorasPorCancha = Math.max(
    1,
    Math.floor(ventanaMin / 60 / canchas),
  );

  let mensaje: string;
  const base = `${partidos} partidos de ${duracion} min en ${jornadas} jornada${jornadas === 1 ? "" : "s"}`;

  if (canchasActuales > 0 && canchasActuales < canchas) {
    const faltan = canchas - canchasActuales;
    mensaje = `${base}: sumá ${faltan} cancha${faltan === 1 ? "" : "s"} en Sedes y disponibilidad, o pasá a ${Math.min(4, jornadas + 1)} jornadas.`;
  } else if (horasPorCancha > ventanaHorasPorCancha) {
    const extra = horasPorCancha - ventanaHorasPorCancha;
    mensaje = `${base}: adelantá el inicio o extendé el cierre del día más cargado (~${extra} h más), o activá una jornada adicional.`;
  } else if (canchasActuales > canchas) {
    mensaje = `${base}: con ${canchasActuales} cancha${canchasActuales === 1 ? "" : "s"} alcanza; revisá franjas horarias si queda algún partido sin slot.`;
  } else {
    mensaje = `${base}: alcanza con ${canchas} cancha${canchas === 1 ? "" : "s"} y franjas de ~${ventanaHorasPorCancha} h por sede.`;
  }

  return { canchas, horas: horasPorCancha, mensaje };
}

function estimarPartidos(parejas: number): number {
  if (parejas < 4) return 0;
  return Math.max(7, Math.ceil(parejas * 1.65));
}

export function evaluarCapacidadDiasCompetencia(input: {
  parejas: number;
  duracionMinutos: number;
  diasSeleccionados: number;
  canchasDisponibles: number;
}): { ok: boolean; mensaje?: string } {
  const jornadas = Math.max(0, Math.floor(input.diasSeleccionados));
  const partidos = estimarPartidos(input.parejas);
  if (jornadas === 0 || partidos === 0) {
    return { ok: jornadas > 0 };
  }
  const canchas = Math.max(1, input.canchasDisponibles || 1);
  const sugActual = sugerirCanchasYHoras({
    partidos,
    duracionMinutos: input.duracionMinutos,
    jornadas: Math.min(4, jornadas),
    canchasActuales: canchas,
  });

  let jornadasMin = jornadas;
  for (let j = jornadas; j <= 4; j++) {
    const sug = sugerirCanchasYHoras({
      partidos,
      duracionMinutos: input.duracionMinutos,
      jornadas: j,
      canchasActuales: canchas,
    });
    if (
      sug.canchas <= canchas &&
      !/adelantá el inicio|extendé el cierre|sumá \d+ cancha/i.test(sug.mensaje)
    ) {
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

  if (!insuficiente) return { ok: true };

  const mensaje =
    jornadasMin > jornadas
      ? `Con ~${partidos} partidos estimados, ${jornadas} día${jornadas === 1 ? "" : "s"} marcado${jornadas === 1 ? "" : "s"} y ${canchas} cancha${canchas === 1 ? "" : "s"} puede no alcanzar. Marcá al menos ${jornadasMin} día${jornadasMin === 1 ? "" : "s"} entre inicio y fin en el Paso 1, o sumá canchas.`
      : `La programación puede quedar ajustada: ${sugActual.mensaje}`;

  return { ok: false, mensaje };
}