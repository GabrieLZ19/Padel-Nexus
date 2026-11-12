import dotenv from "dotenv";
import path from "path";

// Centralizamos la lectura del archivo .env en un solo lugar limpio
dotenv.config({ path: path.join(process.cwd(), ".env") });

if (
  !process.env.SUPABASE_URL ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.SUPABASE_API_KEY
) {
  throw new Error(
    "ERROR CRITICO: Falta configurar las credenciales de Supabase en el archivo .env",
  );
}

/** Origen válido para CORS (https://host, sin barra final). */
export function normalizeFrontendUrl(raw?: string | null): string {
  const fallback = "http://localhost:3000";
  const trimmed = (raw || "").trim();
  if (!trimmed) return fallback;

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/$/, "");
  }

  return `https://${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

function buildCorsOrigins(primary: string): string[] {
  const origins = new Set<string>([primary]);

  try {
    const parsed = new URL(primary);
    const bareHost = parsed.hostname.replace(/^www\./i, "");
    const isLocal =
      bareHost === "localhost" ||
      bareHost === "127.0.0.1" ||
      bareHost.endsWith(".local");

    if (!isLocal) {
      if (parsed.hostname.startsWith("www.")) {
        origins.add(`${parsed.protocol}//${bareHost}`);
      } else {
        origins.add(`${parsed.protocol}//www.${bareHost}`);
      }
    }
  } catch {
    // ignore
  }

  const extras = (process.env.CORS_EXTRA_ORIGINS || "")
    .split(",")
    .map((o) => normalizeFrontendUrl(o))
    .filter((o) => o && o !== "http://localhost:3000");

  for (const o of extras) origins.add(o);

  return [...origins];
}

const frontendUrl = normalizeFrontendUrl(process.env.FRONTEND_URL);

export const env = {
  PORT: process.env.PORT || 4000,
  FRONTEND_URL: frontendUrl,
  /** Orígenes permitidos en CORS (FRONTEND_URL + variante con/sin www + extras). */
  CORS_ORIGINS: buildCorsOrigins(frontendUrl),
  /** URL completa opcional hacia /update-password (debe estar en Redirect URLs de Supabase Auth). */
  RECUPERACION_PASSWORD_REDIRECT_URL:
    process.env.RECUPERACION_PASSWORD_REDIRECT_URL?.trim() || null,
  SUPABASE: {
    URL: process.env.SUPABASE_URL,
    SERVICE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    API_KEY: process.env.SUPABASE_API_KEY,
  },
};
