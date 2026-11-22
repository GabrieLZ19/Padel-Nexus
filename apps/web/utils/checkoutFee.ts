export type CheckoutFeeResumen = {
  monto_bruto: number;
  cargo_servicio?: number;
  modo_fee?: "absorber" | "sumar";
  monto: number;
};

export function debeMostrarDesgloseFee(resumen: CheckoutFeeResumen): boolean {
  return resumen.modo_fee === "sumar" && Number(resumen.cargo_servicio) > 0;
}