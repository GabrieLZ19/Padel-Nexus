export function inscripcionRequierePagoOnline(params: {
  esGratis?: boolean | null;
  monto?: number | null;
  precioInscripcion?: number | null;
  estadoPago?: string | null;
}): boolean {
  if (params.esGratis) return false;
  const monto = Number(params.monto ?? params.precioInscripcion ?? 0);
  if (monto <= 0) return false;
  const estado = (params.estadoPago || "").trim().toLowerCase();
  return estado === "pendiente";
}