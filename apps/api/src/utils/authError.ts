import type { AuthError } from "@supabase/supabase-js";

export function buildRecuperacionRedirectUrl(frontendUrl: string): string {
  const base = String(frontendUrl || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/update-password`;
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

  return fallback;
}
