export const MENSAJE_BAJA_INSCRIPCION_PAGADA =
  "Tu inscripción ya está paga. Para darte de baja y gestionar el reintegro, contactá al club u organizador del torneo.";

const ESTADOS_TORNEO_BLOQUEAN_BAJA = new Set([
  "Programado",
  "En curso",
  "Finalizado",
]);

export function inscripcionPagadaBloqueaBajaJugador(params: {
  sinCosto: boolean;
  estadoPago?: string | null;
}): boolean {
  if (params.sinCosto) return false;
  return (params.estadoPago || "").trim() === "Confirmado";
}

export function torneoEstadoPermiteBajaJugador(
  estadoTorneo?: string | null,
): boolean {
  const estado = (estadoTorneo || "").trim();
  if (!estado) return true;
  return !ESTADOS_TORNEO_BLOQUEAN_BAJA.has(estado);
}

export function jugadorPuedeAutoBaja(params: {
  sinCosto: boolean;
  estadoPago?: string | null;
  estadoTorneo?: string | null;
}): boolean {
  if (inscripcionPagadaBloqueaBajaJugador(params)) return false;
  return torneoEstadoPermiteBajaJugador(params.estadoTorneo);
}