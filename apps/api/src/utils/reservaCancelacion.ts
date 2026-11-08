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
