import { torneoInscripcionSinCosto } from "@/utils/torneoInscripcionSinCosto";

export function inscripcionRequierePagoOnline(params: {
  esGratis?: boolean | null;
  monto?: number | null;
  precioInscripcion?: number | null;
  estadoPago?: string | null;
}): boolean {
  if (
    torneoInscripcionSinCosto({
      es_gratis: params.esGratis,
      precio_inscripcion: params.precioInscripcion ?? 0,
    })
  ) {
    return false;
  }
  const monto = Number(params.monto ?? params.precioInscripcion ?? 0);
  if (monto <= 0) return false;
  const estado = (params.estadoPago || "").trim().toLowerCase();
  return estado === "pendiente";
}