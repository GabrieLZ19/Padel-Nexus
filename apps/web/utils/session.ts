/**
 * Señal de sesión en cliente: el JWT vive en cookie HttpOnly (BFF).
 * `padel_user_role` es legible en JS solo para gating de UI y middleware.
 */
export function getSessionToken(): string | null {
  return null;
}

function readRoleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)padel_user_role=([^;]*)/);
  if (!match) return null;
  const role = decodeURIComponent(match[1]).trim();
  if (!role || role === "undefined" || role === "null") return null;
  return role;
}

export function tieneSesionCliente(): boolean {
  return readRoleCookie() !== null;
}
