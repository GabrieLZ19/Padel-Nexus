import { resendFromAuth } from "./resendConfig";

/**
 * Envío del enlace de recuperación vía Resend cuando Supabase Auth no despacha el correo.
 */
export async function enviarCorreoRecuperacionResend(
  destino: string,
  actionLink: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = resendFromAuth();
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no está configurado en el servidor para enviar recuperación.",
    );
  }

  const html = `
    <p>Recibimos un pedido para restablecer la clave de tu cuenta en Padel Nexus.</p>
    <p><a href="${actionLink}">Restablecer contraseña</a></p>
    <p>Si no solicitaste este cambio, podés ignorar este mensaje.</p>
    <p>El enlace vence en un tiempo limitado por seguridad.</p>
  `.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [destino],
      subject: "Restablecer contraseña — Padel Nexus",
      html,
      text: `Restablecé tu contraseña en Padel Nexus: ${actionLink}`,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text();
    console.error("Resend recuperación de clave falló:", detalle);
    throw new Error(
      "No pudimos enviar el correo de recuperación. Probá más tarde.",
    );
  }
}
