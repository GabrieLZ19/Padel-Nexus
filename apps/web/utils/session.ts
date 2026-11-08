/**
 * Token de sesión en cookie (misma convención que middleware y api.ts).
 * Solo para uso en cliente; en SSR devuelve null.
 */
export function getSessionToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)padel_token=([^;]*)/);
  if (!match) return null;
  const token = decodeURIComponent(match[1]);
  if (!token || token === "undefined" || token === "null") return null;
  return token;
}

export function tieneSesionCliente(): boolean {
  return getSessionToken() !== null;
}
