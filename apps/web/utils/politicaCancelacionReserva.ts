export function etiquetaPlazoCancelacionConfirmada(horas: number): string {
  if (horas <= 0) {
    return "Podés cancelar hasta el inicio del turno.";
  }
  if (horas === 1) {
    return "El club exige cancelar con al menos 1 h de anticipación.";
  }
  return `El club exige cancelar con al menos ${horas} h de anticipación.`;
}

export function lineaReintegroCancelacionReserva(
  estadoPago: string | null | undefined,
): string {
  const estado = String(estadoPago || "").toLowerCase();
  if (estado === "completado") {
    return "Si ya pagaste, el reintegro lo gestiona el club según su política. Puede demorar según el medio de pago.";
  }
  if (estado === "pendiente") {
    return "No hay pago acreditado: al cancelar solo se libera el turno.";
  }
  return "Al cancelar se libera el turno. Consultá con el club si tenés dudas sobre pagos.";
}

export function descripcionModalCancelarReserva(input: {
  clubNombre: string;
  fechaReserva: string;
  horaInicio: string;
  estadoReserva: string;
  estadoPago: string;
  horasAntelacion?: number | null;
}): string {
  const turno = `Se liberará el turno en ${input.clubNombre} el ${input.fechaReserva} a las ${input.horaInicio} hs.`;
  const estadoReserva = String(input.estadoReserva || "").toLowerCase();
  const horas =
    input.horasAntelacion == null || Number.isNaN(Number(input.horasAntelacion))
      ? 24
      : Math.min(168, Math.max(0, Number(input.horasAntelacion)));

  const politica =
    estadoReserva === "confirmada"
      ? etiquetaPlazoCancelacionConfirmada(horas)
      : "Reserva pendiente: podés cancelar en cualquier momento antes del turno.";

  const reintegro = lineaReintegroCancelacionReserva(input.estadoPago);

  return `${turno} ${politica} ${reintegro} Esta acción no se puede deshacer.`;
}
