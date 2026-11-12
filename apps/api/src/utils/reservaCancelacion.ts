export function mensajeNotificacionReservaCanceladaPorJugador(params: {
  jugadorNombre: string;
  canchaNombre: string;
  fechaReserva: string;
  horaInicio: string;
  estadoPago?: string | null;
}): { titulo: string; mensaje: string } {
  const {
    jugadorNombre,
    canchaNombre,
    fechaReserva,
    horaInicio,
    estadoPago,
  } = params;
  const pago = String(estadoPago || "").toLowerCase();
  const pagoTxt =
    pago === "completado"
      ? " Tenía el pago acreditado; revisá reintegros si corresponde."
      : "";
  const mensaje = `${jugadorNombre} canceló el turno en ${canchaNombre} del ${fechaReserva} a las ${horaInicio} hs.${pagoTxt} El horario quedó liberado en la agenda.`;
  return {
    titulo: "Reserva cancelada por el jugador",
    mensaje,
  };
}

export function mensajeNotificacionReservaCanceladaClub(params: {
  clubNombre: string;
  canchaNombre: string;
  fechaReserva: string;
  horaInicio: string;
  motivo?: string | null;
}): { titulo: string; mensaje: string } {
  const { clubNombre, canchaNombre, fechaReserva, horaInicio, motivo } = params;
  const base = `El club ${clubNombre} canceló tu turno en ${canchaNombre} del ${fechaReserva} a las ${horaInicio} hs.`;
  const motivoLimpio = String(motivo || "").trim();
  const mensaje =
    motivoLimpio.length > 0
      ? `${base} Motivo: ${motivoLimpio}`
      : `${base} Consultá "Mis reservas" para el detalle.`;
  return {
    titulo: "Reserva cancelada por el club",
    mensaje,
  };
}
