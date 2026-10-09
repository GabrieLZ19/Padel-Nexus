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

export interface CeldaAgenda {
  cancha_id: string;
  turno_id: string | null;
  reserva: ReservaEnAgenda | null;
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
        return {
          cancha_id: canchaId,
          turno_id: turno?.id ?? null,
          reserva: turno ? (reservaPorTurno.get(turno.id) ?? null) : null,
        };
      }),
    };
  });
}
