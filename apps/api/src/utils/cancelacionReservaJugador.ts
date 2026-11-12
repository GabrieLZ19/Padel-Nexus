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

export function etiquetaPlazoCancelacionConfirmada(horas: number): string {
  if (horas <= 0) {
    return "Podés cancelar hasta el inicio del turno.";
  }
  if (horas === 1) {
    return "El club exige cancelar con al menos 1 h de anticipación.";
  }
  return `El club exige cancelar con al menos ${horas} h de anticipación.`;
}

/** Texto para el aviso de reintegro al confirmar cancelación (jugador). */
export function lineaReintegroCancelacionReserva(
  estadoPago: string | null | undefined,
): string {
  const estado = String(estadoPago || "").toLowerCase();
  if (estado === "completado") {
    return "Si ya pagaste, el reintegro lo gestiona el club según su política. Puede demorar según el medio de pago.";
  }
  if (estado === "pendiente") {
    return "No hay pago acreditado: al cancelar solo se libera el turno.";
  }
  return "Al cancelar se libera el turno. Consultá con el club si tenés dudas sobre pagos.";
}

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
