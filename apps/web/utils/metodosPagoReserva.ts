export type MetodoPagoReserva = "mercadopago" | "transferencia" | "efectivo";

export interface ClubMetodosPagoUi {
  cbu?: string | null;
  alias?: string | null;
  suscripcion_sin_comisiones?: boolean | null;
  pago_transferencia_habilitado?: boolean | null;
  pago_efectivo_habilitado?: boolean | null;
}

/** Misma regla que el backend: MP siempre; alternativos solo con suscripción. */
export function metodosPagoReservaDisponibles(
  club: ClubMetodosPagoUi | null | undefined,
): MetodoPagoReserva[] {
  const metodos: MetodoPagoReserva[] = ["mercadopago"];
  if (!club?.suscripcion_sin_comisiones) return metodos;

  const tieneDatosBancarios = !!(club.cbu?.trim() || club.alias?.trim());
  if (club.pago_transferencia_habilitado && tieneDatosBancarios) {
    metodos.push("transferencia");
  }
  if (club.pago_efectivo_habilitado) {
    metodos.push("efectivo");
  }
  return metodos;
}
