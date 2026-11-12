/** Debe coincidir con RESERVA_PENDIENTE_RETENCION_MINUTOS del API. */
const RESERVA_PENDIENTE_RETENCION_MINUTOS = 20;

/** Debe coincidir con RESERVA_MOTIVO_PAGO_VENCIDO del API. */
export const RESERVA_MOTIVO_PAGO_VENCIDO = "Plazo de pago vencido";

export function esReservaVencidaPorPago(reserva: {
  estado_reserva?: string | null;
  motivo_cancelacion?: string | null;
}): boolean {
  return (
    (reserva.estado_reserva || "").toLowerCase() === "cancelada" &&
    (reserva.motivo_cancelacion || "").trim() === RESERVA_MOTIVO_PAGO_VENCIDO
  );
}

export type ReservaConPlazoPago = {
  retiene_hasta?: string | null;
  created_at?: string | null;
  estado_reserva?: string | null;
  estado_pago?: string | null;
};

export function limitePagoMs(reserva: ReservaConPlazoPago): number | null {
  const estado = (reserva.estado_reserva || "").toLowerCase();
  if (estado !== "pendiente") return null;
  if ((reserva.estado_pago || "").toLowerCase() === "completado") return null;

  if (reserva.retiene_hasta) {
    const t = new Date(reserva.retiene_hasta).getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (reserva.created_at) {
    const base = new Date(reserva.created_at).getTime();
    if (Number.isNaN(base)) return null;
    return base + RESERVA_PENDIENTE_RETENCION_MINUTOS * 60_000;
  }
  return null;
}

export function msRestantesPlazoPago(reserva: ReservaConPlazoPago, ahora = Date.now()) {
  const limite = limitePagoMs(reserva);
  if (limite == null) return null;
  return limite - ahora;
}

export function formatearCuentaRegresiva(ms: number): string {
  const totalSeg = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSeg / 60);
  const seg = totalSeg % 60;
  return `${min}:${String(seg).padStart(2, "0")}`;
}
