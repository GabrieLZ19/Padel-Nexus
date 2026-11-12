import type { AuthError } from "@supabase/supabase-js";

export function buildRecuperacionRedirectUrl(frontendUrl: string): string {
  const override = process.env.RECUPERACION_PASSWORD_REDIRECT_URL?.trim();
  if (override) {
    return override.replace(/\/$/, "");
  }
  const base = String(frontendUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/update-password`;
}

const MENSAJE_REDIRECT_NO_PERMITIDO =
  "No pudimos enviar el correo: la URL de restablecimiento no está autorizada en Auth. Agregá la URL de /update-password en Supabase (URL Configuration) o configurá RECUPERACION_PASSWORD_REDIRECT_URL y Resend en el servidor.";

export function esErrorUsuarioInexistenteRecuperacion(
  error: AuthError | null | undefined,
): boolean {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("user not found") ||
    msg.includes("usuario no encontrado") ||
    msg.includes("not found")
  );
}

export function esErrorRedirectRecuperacion(
  error: AuthError | null | undefined,
): boolean {
  if (!error) return false;
  const msg = String(error.message || "").toLowerCase();
  return (
    msg.includes("redirect") ||
    msg.includes("redirect_to") ||
    (msg.includes("url") && msg.includes("valid"))
  );
}

export function mensajeErrorSupabaseAuth(
  error: AuthError | null | undefined,
  fallback: string,
): string {
  if (!error) return fallback;

  const msg = String(error.message || "").trim();
  if (msg && msg !== "{}") return msg;

  const status = (error as AuthError & { status?: number }).status;
  if (status === 429) {
    return "Demasiados intentos. Probá de nuevo en unos minutos.";
  }

  if (esErrorRedirectRecuperacion(error)) {
    return MENSAJE_REDIRECT_NO_PERMITIDO;
  }

  return fallback;
}

export function mensajeFallbackRecuperacionCorreo(): string {
  return "No pudimos enviar el correo de recuperación. Revisá que el enlace de restablecimiento esté habilitado en la plataforma y que el servidor tenga correo (Supabase SMTP o Resend).";
}
