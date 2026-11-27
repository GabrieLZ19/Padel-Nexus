/** RES-24: etiquetas unificadas de pago / reintegro (club y jugador). */
export const ETIQUETA_ESTADO_PAGO_RESERVA: Record<string, string> = {
  pendiente: "Pago pendiente",
  pendiente_en_club: "Cobrar en el club",
  completado: "Pagado",
  rechazado: "Pago rechazado",
  cancelado: "Sin cobro",
  reembolso_pendiente: "A devolver",
  reembolsado: "Devuelta",
};

export function etiquetaEstadoPagoReserva(estado?: string | null): string {
  const key = String(estado || "").trim().toLowerCase();
  return ETIQUETA_ESTADO_PAGO_RESERVA[key] || estado || "—";
}