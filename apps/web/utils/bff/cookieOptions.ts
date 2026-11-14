const SECURE =
  process.env.NODE_ENV === "production" ||
  process.env.FORCE_SECURE_COOKIES === "1";

export const SESSION_COOKIE_PATH = "/";

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: SECURE,
    sameSite: "lax" as const,
    path: SESSION_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  };
}

export function roleCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: false,
    secure: SECURE,
    sameSite: "lax" as const,
    path: SESSION_COOKIE_PATH,
    maxAge: maxAgeSeconds,
  };
}

export const MAX_AGE_SESSION_DEFAULT = 60 * 60 * 24;
export const MAX_AGE_SESSION_REMEMBER = 60 * 60 * 24 * 30;
