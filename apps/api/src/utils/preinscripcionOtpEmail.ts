import { resendFromAuth } from "./resendConfig";

/**
 * Envía el código OTP de activación padrón FAP al correo indicado por el jugador.
 */
export async function enviarOtpActivacionPadronResend(
  email: string,
  codigo: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resendFromAuth();
  if (!apiKey) {
    throw new Error(
      "El servidor no tiene configurado el envío de correo para códigos de activación.",
    );
  }

  const destino = email.trim();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [destino],
      subject: "Código de activación – Padel Nexus",
      html: `<p>Tu código para activar la cuenta es: <strong>${codigo}</strong></p><p>Vence en 15 minutos.</p>`,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    console.error("Resend OTP activación padrón falló:", detalle);
    throw new Error("No pudimos enviar el código al correo. Intentá más tarde.");
  }
}