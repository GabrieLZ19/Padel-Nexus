type TurnoEmbed = { precio?: number | null } | { precio?: number | null }[] | null | undefined;

export function montoTurnoDesdeReserva(reserva: {
  turnos?: TurnoEmbed;
}): number {
  const turno = Array.isArray(reserva.turnos)
    ? reserva.turnos[0]
    : reserva.turnos;
  const precio = Number(turno?.precio);
  if (!Number.isFinite(precio) || precio < 0) {
    throw new Error("No se pudo determinar el precio del turno en el sistema.");
  }
  return precio;
}