/**
 * Fuente única del access token de Mercado Pago.
 * En .env del API usar MP_ACCESS_TOKEN (mismo nombre que reservas).
 */
export function getMercadoPagoAccessToken(): string | undefined {
  const token =
    process.env.MP_ACCESS_TOKEN?.trim() ||
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token || token === "TEST" || token === "TEST-TOKEN-MOCK") {
    return undefined;
  }
  return token;
}

export function isMercadoPagoConfigured(): boolean {
  const token = getMercadoPagoAccessToken();
  if (!token) return false;
  return token.startsWith("APP_USR-") || token.startsWith("TEST-");
}

export function resolveMercadoPagoInitPoint(
  token: string,
  initPoint?: string | null,
  sandboxInitPoint?: string | null,
): string | null {
  if (token.startsWith("TEST-")) {
    return sandboxInitPoint || initPoint || null;
  }
  return initPoint || sandboxInitPoint || null;
}

const MOBILE_SCHEME = process.env.MOBILE_SCHEME || "padelnexus";

export interface MercadoPagoBackUrls {
  success: string;
  failure: string;
  pending: string;
}

/**
 * URLs de retorno post-checkout.
 * Mobile usa deep link padelnexus:// para volver a la app.
 */
export function buildMercadoPagoBackUrls(options: {
  mobile?: boolean;
  webPath: string;
  mobileParams?: Record<string, string>;
}): MercadoPagoBackUrls {
  const baseWeb = process.env.FRONTEND_URL || "http://localhost:3000";

  if (options.mobile) {
    const build = (payment: string) => {
      const params = new URLSearchParams({
        ...options.mobileParams,
        payment,
      });
      return `${MOBILE_SCHEME}://pago/retorno?${params.toString()}`;
    };
    return {
      success: build("success"),
      failure: build("failure"),
      pending: build("pending"),
    };
  }

  const extra = options.mobileParams
    ? `&${new URLSearchParams(options.mobileParams).toString()}`
    : "";

  return {
    success: `${baseWeb}${options.webPath}?payment=success${extra}`,
    failure: `${baseWeb}${options.webPath}?payment=failure${extra}`,
    pending: `${baseWeb}${options.webPath}?payment=pending${extra}`,
  };
}

export function isMobileClient(headerValue?: string | null): boolean {
  return (headerValue || "").toLowerCase() === "mobile";
}
