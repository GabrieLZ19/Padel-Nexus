import {
  RESERVA_MP_RETENCION_MINUTOS,
  RESERVA_PENDIENTE_RETENCION_MINUTOS,
  RESERVA_TRANSFERENCIA_RETENCION_MINUTOS,
} from "../constants/reserva";

export interface ReservaRetencionInput {
  estado_reserva: string | null;
  created_at?: string | null;
  retiene_hasta?: string | null;
}

export function sumarMinutos(desde: Date, minutos: number): Date {
  return new Date(desde.getTime() + minutos * 60_000);
}

export function retencionInicialDesde(ahora: Date): string {
  return sumarMinutos(ahora, RESERVA_PENDIENTE_RETENCION_MINUTOS).toISOString();
}

export function retencionMercadoPagoDesde(ahora: Date): string {
  return sumarMinutos(ahora, RESERVA_MP_RETENCION_MINUTOS).toISOString();
}

export function retencionTransferenciaDesde(ahora: Date): string {
  return sumarMinutos(ahora, RESERVA_TRANSFERENCIA_RETENCION_MINUTOS).toISOString();
}

/**
 * Indica si la reserva bloquea el turno para otras personas.
 */
export function reservaOcupaTurno(
  reserva: ReservaRetencionInput,
  ahora = new Date(),
): boolean {
  const estado = (reserva.estado_reserva || "").toLowerCase();
  if (estado === "confirmada") return true;
  if (estado === "cancelada" || estado === "ausente") return false;
  if (estado !== "pendiente") return false;

  if (reserva.retiene_hasta) {
    return ahora < new Date(reserva.retiene_hasta);
  }

  if (reserva.created_at) {
    const limite = sumarMinutos(
      new Date(reserva.created_at),
      RESERVA_PENDIENTE_RETENCION_MINUTOS,
    );
    return ahora < limite;
  }

  return false;
}

export function reservaPendienteExpirada(
  reserva: ReservaRetencionInput,
  ahora = new Date(),
): boolean {
  const estado = (reserva.estado_reserva || "").toLowerCase();
  if (estado !== "pendiente") return false;
  return !reservaOcupaTurno(reserva, ahora);
}

/** Instantáneo límite para completar el pago de una reserva pendiente (ISO o ms). */
export function limitePagoReserva(
  reserva: ReservaRetencionInput,
): Date | null {
  const estado = (reserva.estado_reserva || "").toLowerCase();
  if (estado !== "pendiente") return null;
  if (reserva.retiene_hasta) {
    return new Date(reserva.retiene_hasta);
  }
  if (reserva.created_at) {
    return sumarMinutos(
      new Date(reserva.created_at),
      RESERVA_PENDIENTE_RETENCION_MINUTOS,
    );
  }
  return null;
}
