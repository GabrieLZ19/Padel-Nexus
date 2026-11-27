import type { CheckoutFeeResumen } from "./checkoutFee.ts";
import { debeMostrarDesgloseFee } from "./checkoutFee.ts";

export function textoResumenCheckoutMp(
  resumen: CheckoutFeeResumen | null | undefined,
  montoFallback: number,
): string {
  if (resumen && debeMostrarDesgloseFee(resumen)) {
    const bruto = Number(resumen.monto_bruto ?? 0);
    const fee = Number(resumen.cargo_servicio ?? 0);
    const total = Number(resumen.monto ?? 0);
    return [
      `Inscripción: $${bruto.toLocaleString("es-AR")}`,
      `Cargo por servicio: $${fee.toLocaleString("es-AR")}`,
      `Total a pagar: $${total.toLocaleString("es-AR")}`,
    ].join("\n");
  }
  return `Total a pagar: $${Number(montoFallback).toLocaleString("es-AR")}`;
}