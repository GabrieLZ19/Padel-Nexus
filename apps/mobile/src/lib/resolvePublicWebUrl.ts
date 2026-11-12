import { resolveApiUrl } from "@/src/lib/resolveApiUrl";

/**
 * URL del sitio público (terminos, privacidad). Prioriza EXPO_PUBLIC_WEB_URL;
 * si no está, infiere el origen quitando el sufijo /api de la URL de la API.
 */
export function resolvePublicWebUrl(path = ""): string {
  const configured = process.env.EXPO_PUBLIC_WEB_URL?.trim();
  const base = configured || resolveApiUrl().replace(/\/api\/?$/, "");

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base.replace(/\/$/, "")}${normalizedPath}`;
}
