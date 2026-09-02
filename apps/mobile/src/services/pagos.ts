import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

export interface PreferenciaMercadoPago {
  preferenceId: string;
  initPoint?: string | null;
  sandboxInitPoint?: string | null;
  mockConfirmed?: boolean;
  paymentId?: string;
  licencia?: unknown;
}

export function resolverUrlCheckout(
  preferencia: PreferenciaMercadoPago,
): string | null {
  return preferencia.initPoint || preferencia.sandboxInitPoint || null;
}

export type ResultadoCheckout =
  | { tipo: "exito"; paymentId?: string }
  | { tipo: "fallo" }
  | { tipo: "pendiente" }
  | { tipo: "cerrado" };

function parsearRetornoMercadoPago(url: string): ResultadoCheckout {
  try {
    const parsed = Linking.parse(url);
    const params = parsed.queryParams ?? {};
    const status = String(
      params.payment ?? params.status ?? params.collection_status ?? "",
    ).toLowerCase();
    const paymentId = String(
      params.payment_id ?? params.collection_id ?? "",
    );

    if (status === "success" || status === "approved") {
      return { tipo: "exito", paymentId: paymentId || undefined };
    }
    if (status === "failure" || status === "rejected") {
      return { tipo: "fallo" };
    }
    if (status === "pending") {
      return { tipo: "pendiente" };
    }
    return { tipo: "cerrado" };
  } catch {
    return { tipo: "cerrado" };
  }
}

/**
 * Abre el checkout de Mercado Pago en el navegador in-app.
 * Si el backend simuló el pago (sin token MP), confirma sin abrir localhost.
 */
export async function abrirCheckoutMercadoPago(
  preferencia: PreferenciaMercadoPago,
): Promise<ResultadoCheckout> {
  if (preferencia.mockConfirmed) {
    return {
      tipo: "exito",
      paymentId: preferencia.paymentId || `mock-${Date.now()}`,
    };
  }

  const checkoutUrl = resolverUrlCheckout(preferencia);
  if (!checkoutUrl) {
    throw new Error("No se recibió una URL de pago válida.");
  }

  // Evitar abrir localhost en mobile (mock mal configurado)
  if (
    checkoutUrl.includes("localhost") ||
    checkoutUrl.includes("127.0.0.1")
  ) {
    return {
      tipo: "exito",
      paymentId: preferencia.paymentId || `mock-local-${Date.now()}`,
    };
  }

  const redirectUrl = Linking.createURL("pago/retorno");

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      checkoutUrl,
      redirectUrl,
    );

    if (result.type === "success" && result.url) {
      return parsearRetornoMercadoPago(result.url);
    }
    if (result.type === "cancel") {
      return { tipo: "cerrado" };
    }
  } catch {
    await WebBrowser.openBrowserAsync(checkoutUrl);
  }

  return { tipo: "cerrado" };
}
