import { esHorarioReservaPasado } from "./fechaArgentina";

export const DEFAULT_HORAS_ANTELACION_CANCELACION_JUGADOR = 24;

export function horasAntelacionCancelacionClub(
  valor: number | null | undefined,
): number {
  if (valor == null || Number.isNaN(Number(valor))) {
    return DEFAULT_HORAS_ANTELACION_CANCELACION_JUGADOR;
  }
  return Math.min(168, Math.max(0, Number(valor)));
}

/** Minutos hasta el inicio del turno (fecha + hora en Argentina UTC-3). */
export function minutosHastaInicioTurno(
  fechaReserva: string,
  horaInicio: string,
  ahora: Date = new Date(),
): number {
  const hora = (horaInicio || "00:00").slice(0, 5);
  const inicio = new Date(`${fechaReserva}T${hora}:00-03:00`);
  return Math.floor((inicio.getTime() - ahora.getTime()) / 60_000);
}

export type EvaluacionCancelacionJugador = {
  permitido: boolean;
  motivo?: string;
  horas_antelacion?: number;
};

export function evaluarCancelacionReservaJugador(input: {
  estado_reserva?: string | null;
  fecha_reserva: string;
  hora_inicio: string;
  horas_antelacion_club?: number | null;
  ahora?: Date;
}): EvaluacionCancelacionJugador {
  const ahora = input.ahora ?? new Date();
  const estado = String(input.estado_reserva || "").toLowerCase();
  const horas = horasAntelacionCancelacionClub(input.horas_antelacion_club);

  if (estado === "cancelada") {
    return { permitido: false, motivo: "Esta reserva ya fue cancelada." };
  }
  if (estado === "ausente") {
    return { permitido: false, motivo: "Esta reserva está marcada como ausencia." };
  }
  if (esHorarioReservaPasado(input.fecha_reserva, input.hora_inicio, ahora)) {
    return { permitido: false, motivo: "El turno ya comenzó o finalizó." };
  }

  if (estado === "pendiente") {
    return { permitido: true, horas_antelacion: horas };
  }

  if (estado === "confirmada") {
    const minutosRestantes = minutosHastaInicioTurno(
      input.fecha_reserva,
      input.hora_inicio,
      ahora,
    );
    const minutosRequeridos = horas * 60;
    if (minutosRestantes < minutosRequeridos) {
      const etiqueta =
        horas === 0
          ? "El club no permite cancelar confirmadas con este margen."
          : `El club exige cancelar con al menos ${horas} h de anticipación.`;
      return {
        permitido: false,
        motivo: etiqueta,
        horas_antelacion: horas,
      };
    }
    return { permitido: true, horas_antelacion: horas };
  }

  return { permitido: false, motivo: "No podés cancelar esta reserva." };
}
