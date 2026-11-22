import crypto from "crypto";
import type { Request } from "express";

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

/**
 * Clave secreta de Webhooks (MP > Tus integraciones > Webhooks).
 * Variable: MP_WEBHOOK_SECRET
 */
export function getMercadoPagoWebhookSecret(): string | undefined {
  const secret =
    process.env.MP_WEBHOOK_SECRET?.trim() ||
    process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  return secret || undefined;
}

export function mercadoPagoNotificationUrl(apiPath: string): string {
  const base = (process.env.BACKEND_URL || "http://localhost:4000").replace(
    /\/$/,
    "",
  );
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;
  return `${base}${path}`;
}

export type MercadoPagoEntidadRef =
  | { canal: "inscripcion"; id: string; plazas?: number[] }
  | { canal: "licencia"; id: string }
  | { canal: "reserva"; id: string }
  | { canal: "desconocido"; id: string };

export function buildInscripcionExternalReference(
  inscripcionId: string,
  plazas: number[],
): string {
  const nums = [...new Set(plazas.filter((n) => n === 1 || n === 2))].sort();
  if (!nums.length) {
    return `inscripcion:${inscripcionId}`;
  }
  if (nums.length === 1) {
    return `inscripcion:${inscripcionId}:plaza-${nums[0]}`;
  }
  return `inscripcion:${inscripcionId}:plazas-${nums.join("-")}`;
}

function parsePlazasInscripcionRef(spec: string | undefined): number[] | undefined {
  if (!spec) return undefined;
  if (spec.startsWith("plaza-")) {
    const n = Number(spec.slice(6));
    return n === 1 || n === 2 ? [n] : undefined;
  }
  if (spec.startsWith("plazas-")) {
    const nums = spec
      .slice(7)
      .split("-")
      .map((x) => Number(x))
      .filter((n) => n === 1 || n === 2);
    return nums.length ? nums : undefined;
  }
  return undefined;
}

export function parseMercadoPagoExternalReference(
  externalReference: string,
): MercadoPagoEntidadRef {
  const ref = externalReference.trim();
  if (ref.startsWith("inscripcion:")) {
    const tail = ref.slice("inscripcion:".length);
    const sep = tail.indexOf(":");
    if (sep === -1) {
      return { canal: "inscripcion", id: tail };
    }
    const id = tail.slice(0, sep);
    const plazas = parsePlazasInscripcionRef(tail.slice(sep + 1));
    return { canal: "inscripcion", id, plazas };
  }
  if (ref.startsWith("licencia:")) {
    return { canal: "licencia", id: ref.slice("licencia:".length) };
  }
  if (ref.includes(":")) {
    return { canal: "desconocido", id: ref };
  }
  return { canal: "reserva", id: ref };
}

/**
 * Valida x-signature según documentación de Mercado Pago (HMAC SHA256).
 * Con MP configurado, exige MP_WEBHOOK_SECRET (evita simular pagos sin firma).
 */
export function verifyMercadoPagoWebhookSignature(req: Request): boolean {
  const secret = getMercadoPagoWebhookSecret();
  if (!secret) {
    return !isMercadoPagoConfigured();
  }

  const xSignature = req.headers["x-signature"];
  if (typeof xSignature !== "string" || !xSignature) return false;

  let ts = "";
  let v1 = "";
  for (const segment of xSignature.split(",")) {
    const trimmed = segment.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return false;

  const queryDataId = req.query["data.id"];
  const bodyDataId = req.body?.data?.id;
  const rawDataId =
    (typeof queryDataId === "string" ? queryDataId : undefined) ??
    (bodyDataId != null ? String(bodyDataId) : undefined);

  const xRequestId = req.headers["x-request-id"];
  const manifestParts: string[] = [];
  if (rawDataId) {
    manifestParts.push(`id:${rawDataId.toLowerCase()}`);
  }
  if (typeof xRequestId === "string" && xRequestId) {
    manifestParts.push(`request-id:${xRequestId}`);
  }
  manifestParts.push(`ts:${ts}`);
  const manifest = `${manifestParts.join(";")};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  return expected === v1;
}
