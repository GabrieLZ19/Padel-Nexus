export interface TurnoAgenda {
  id: string;
  cancha_id: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface ReservaEnAgenda {
  id: string;
  turno_id: string;
  estado_reserva: string;
  estado_pago: string;
  jugador: string;
  precio: number;
}

export interface BloqueoAgenda {
  cancha_id: string | null;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  tipo?: string | null;
}

export interface BloqueoEnCelda {
  motivo: string;
  tipo: string | null;
}

export interface CeldaAgenda {
  cancha_id: string;
  turno_id: string | null;
  reserva: ReservaEnAgenda | null;
  bloqueo: BloqueoEnCelda | null;
}

function toMinutos(hora: string): number {
  const [h, m] = String(hora).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

export function horariosSeSolapan(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  const aS = toMinutos(aStart);
  const aRawE = toMinutos(aEnd);
  const aE = aRawE <= aS ? aRawE + 1440 : aRawE;
  const bS = toMinutos(bStart);
  const bRawE = toMinutos(bEnd);
  const bE = bRawE <= bS ? bRawE + 1440 : bRawE;
  return aS < bE && aE > bS;
}

export function bloqueoQueAfectaTurno(
  bloqueos: BloqueoAgenda[],
  canchaId: string,
  horaInicio: string,
  horaFin: string,
): BloqueoAgenda | null {
  const hit = bloqueos.find((bloqueo) => {
    if (bloqueo.cancha_id && bloqueo.cancha_id !== canchaId) return false;
    return horariosSeSolapan(
      horaInicio,
      horaFin,
      String(bloqueo.hora_inicio),
      String(bloqueo.hora_fin),
    );
  });
  return hit ?? null;
}

export interface FilaAgenda {
  hora_inicio: string;
  hora_fin: string;
  celdas: CeldaAgenda[];
}

export function horaCorta(valor: string) {
  return String(valor || "").slice(0, 5);
}

export function hoyArgentina(ahora = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(ahora);
}

export function esReservaAtrasada(
  fecha: string,
  estado: string,
  hoy = hoyArgentina(),
): boolean {
  return estado === "pendiente" && fecha < hoy;
}

/** Una fila por horario y una celda por cancha, con la reserva de ese turno si existe. */
export function armarFilasAgenda(
  canchaIds: string[],
  turnos: TurnoAgenda[],
  reservas: ReservaEnAgenda[],
  bloqueos: BloqueoAgenda[] = [],
): FilaAgenda[] {
  const reservaPorTurno = new Map(reservas.map((reserva) => [reserva.turno_id, reserva]));
  const horas = [...new Set(turnos.map((turno) => horaCorta(turno.hora_inicio)))].sort();

  return horas.map((hora) => {
    const deLaHora = turnos.filter((turno) => horaCorta(turno.hora_inicio) === hora);
    return {
      hora_inicio: hora,
      hora_fin: horaCorta(deLaHora[0]?.hora_fin || hora),
      celdas: canchaIds.map((canchaId) => {
        const turno = deLaHora.find((item) => item.cancha_id === canchaId) ?? null;
        const bloqueoHit = turno
          ? bloqueoQueAfectaTurno(
              bloqueos,
              canchaId,
              turno.hora_inicio,
              turno.hora_fin,
            )
          : null;
        return {
          cancha_id: canchaId,
          turno_id: turno?.id ?? null,
          reserva: turno ? (reservaPorTurno.get(turno.id) ?? null) : null,
          bloqueo: bloqueoHit
            ? {
                motivo: bloqueoHit.motivo?.trim() || "Horario bloqueado",
                tipo: bloqueoHit.tipo?.trim() || null,
              }
            : null,
        };
      }),
    };
  });
}
