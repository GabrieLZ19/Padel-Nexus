import { env } from "../config/env.config";

const DEFAULT_AUTH_FROM = "Padel Nexus <no-responder@padelnexus.app>";
const DEFAULT_CAMPANA_EMAIL = "info@padelnexus.app";

export function campanaEmailHabilitado(): boolean {
  return process.env.RESEND_CAMPANA_EMAIL_HABILITADO === "true";
}

export function resendFromAuth(): string {
  return (
    process.env.RESEND_FROM_AUTH?.trim() ||
    process.env.RESEND_FROM?.trim() ||
    DEFAULT_AUTH_FROM
  );
}

/**
 * Remitente de campañas: «Entidad · Padel Nexus <info@...>».
 */
export function resendFromCampana(entidadLabel: string): string {
  const email =
    process.env.RESEND_CAMPAIGN_FROM_EMAIL?.trim() ||
    extractEmailFromFromHeader(process.env.RESEND_FROM_CAMPAIGNS) ||
    extractEmailFromFromHeader(process.env.RESEND_FROM) ||
    DEFAULT_CAMPANA_EMAIL;

  const entidad = (entidadLabel || "Padel Nexus").trim();
  const displayName = `${entidad} · Padel Nexus`;
  return `${displayName} <${email}>`;
}

function extractEmailFromFromHeader(from?: string | null): string | null {
  const raw = (from || "").trim();
  if (!raw) return null;
  const match = raw.match(/<([^>]+)>/);
  if (match?.[1]) return match[1].trim();
  if (raw.includes("@")) return raw;
  return null;
}

export function urlGestionarNotificaciones(): string {
  const base = (env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/mi-perfil/ajustes#notificaciones`;
}
