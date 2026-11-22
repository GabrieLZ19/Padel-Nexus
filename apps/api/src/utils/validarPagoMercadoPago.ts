import { MercadoPagoConfig, Payment } from "mercadopago";
import { getMercadoPagoAccessToken } from "../config/mercadopago";

export function paymentIdMercadoPagoValido(paymentId: string): boolean {
  const id = String(paymentId || "").trim();
  return /^\d+$/.test(id) && Number(id) > 0;
}

export type ValidacionPagoMpEntidad = {
  paymentId: string;
  externalReferenceEsperada: string;
  montoEsperado?: number;
  toleranciaMonto?: number;
};

/**
 * Consulta MP y valida existencia, estado approved, external_reference y monto (FEE-2).
 */
export async function validarPagoMercadoPagoAprobado(
  params: ValidacionPagoMpEntidad,
): Promise<{ monto: number; paymentId: string }> {
  const paymentId = String(params.paymentId || "").trim();
  if (!paymentIdMercadoPagoValido(paymentId)) {
    throw new Error("Se requiere un payment_id numérico de Mercado Pago.");
  }

  const token = getMercadoPagoAccessToken();
  if (!token) {
    throw new Error("Mercado Pago no está configurado.");
  }

  const mpClient = new MercadoPagoConfig({ accessToken: token });
  const paymentClient = new Payment(mpClient);

  let paymentDetails;
  try {
    paymentDetails = await paymentClient.get({ id: Number(paymentId) });
  } catch {
    throw new Error("No se encontró el pago en Mercado Pago.");
  }

  if (paymentDetails.status !== "approved") {
    throw new Error(
      `El pago no está aprobado. Estado: ${paymentDetails.status ?? "desconocido"}`,
    );
  }

  const refEsperada = String(params.externalReferenceEsperada || "").trim();
  const refPago = String(paymentDetails.external_reference || "").trim();
  if (!refEsperada || refPago !== refEsperada) {
    throw new Error("El pago no corresponde a esta licencia.");
  }

  const monto = Number(paymentDetails.transaction_amount ?? 0);
  const montoEsperado = params.montoEsperado;
  if (montoEsperado != null && montoEsperado > 0) {
    const tolerancia = params.toleranciaMonto ?? 0.5;
    if (Math.abs(monto - montoEsperado) > tolerancia) {
      throw new Error("El monto del pago no coincide con el de la licencia.");
    }
  }

  return { monto, paymentId };
}