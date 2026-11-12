/** Minutos que se retiene el turno al crear la reserva (checkout / pre-pago). */
export const RESERVA_PENDIENTE_RETENCION_MINUTOS = 20;

/** Minutos de retención al abrir Mercado Pago (desde ese momento; TTL de la preferencia). */
export const RESERVA_MP_RETENCION_MINUTOS = 15;

/** Retención mientras el club valida una transferencia. */
export const RESERVA_TRANSFERENCIA_RETENCION_MINUTOS = 60 * 24 * 14;

/** Motivo al liberar el turno por TTL de pago (RES-12). */
export const RESERVA_MOTIVO_PAGO_VENCIDO = "Plazo de pago vencido";
