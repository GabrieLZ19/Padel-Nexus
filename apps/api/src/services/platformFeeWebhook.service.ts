import { Payment, MercadoPagoConfig } from "mercadopago";
import { getMercadoPagoAccessToken } from "../config/mercadopago";
import { PlatformFeeService } from "./platformFee.service";

export async function acreditarSaldoTorneoMercadoPago(
  paymentId: string,
): Promise<void> {
  const token = getMercadoPagoAccessToken();
  if (!token) return;

  const mpClient = new MercadoPagoConfig({ accessToken: token });
  const payment = new Payment(mpClient);
  const result = await payment.get({ id: paymentId });
  const status = result.status;
  if (status !== "approved") return;

  const externalReference = String(result.external_reference || "");
  if (!externalReference.startsWith("saldo_torneo:")) return;

  const torneoId = externalReference.slice("saldo_torneo:".length);
  if (!torneoId) return;

  await PlatformFeeService.confirmarSaldoTorneoDesdeWebhook(
    torneoId,
    paymentId,
  );
}