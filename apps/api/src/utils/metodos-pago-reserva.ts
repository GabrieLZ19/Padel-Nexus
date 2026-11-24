export type MetodoPagoReserva = "mercadopago" | "transferencia" | "efectivo";

export interface ClubMetodosPagoConfig {
  cbu?: string | null;
  alias?: string | null;
  suscripcion_sin_comisiones?: boolean | null;
  pago_transferencia_habilitado?: boolean | null;
  pago_efectivo_habilitado?: boolean | null;
}

/** Fragmento select anidado `clubes (...)` para checkout de reservas. */
export const CLUB_SELECT_METODOS_PAGO =
  "id, nombre, provincia, localidad, cbu, alias, suscripcion_sin_comisiones, pago_transferencia_habilitado, pago_efectivo_habilitado" as const;

export function normalizarMetodoPagoReserva(metodo: string): string {
  if (metodo === "MercadoPago") return "mercadopago";
  return metodo;
}

/**
 * Mercado Pago siempre disponible (recomendado).
 * Transferencia y pago en club solo con suscripción sin comisiones
 * y el flag correspondiente habilitado.
 */
export function metodosPagoReservaDisponibles(
  club: ClubMetodosPagoConfig | null | undefined,
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

export function assertMetodoPagoReservaPermitido(
  club: ClubMetodosPagoConfig | null | undefined,
  metodo: string,
): void {
  const normalizado = normalizarMetodoPagoReserva(metodo);
  const disponibles = metodosPagoReservaDisponibles(club);
  if (!disponibles.includes(normalizado as MetodoPagoReserva)) {
    throw new Error(
      "Este método de pago no está habilitado para el club. Usá Mercado Pago o contactá al club.",
    );
  }
}

/** Mensaje cuando se intenta confirmar MP por POST /reservas/:id/pagar (FEE-13). */
export const METODO_MP_RESERVA_SOLO_CHECKOUT =
  "El pago con Mercado Pago se confirma únicamente desde el checkout o al retornar del pago. Usá transferencia o efectivo si el club los tiene habilitados.";

/**
 * Validación para confirmación manual de pago (transferencia / efectivo).
 * Mercado Pago no se acepta en esta ruta: solo webhook o confirmar-retorno con consulta a MP.
 */
export function assertMetodoPagoManualReservaPermitido(
  club: ClubMetodosPagoConfig | null | undefined,
  metodo: string,
): void {
  const normalizado = normalizarMetodoPagoReserva(metodo);
  if (normalizado === "mercadopago") {
    throw new Error(METODO_MP_RESERVA_SOLO_CHECKOUT);
  }
  assertMetodoPagoReservaPermitido(club, metodo);
}
