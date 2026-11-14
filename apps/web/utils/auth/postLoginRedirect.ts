const SESSION_KEY = "padel_post_login_redirect";

export type PostLoginRedirectPendiente = {
  path: string | null;
  fragment: string | null;
};

export function buildMiddlewareLoginRedirect(
  pathname: string,
  search: string,
): string {
  return `${pathname}${search || ""}`;
}

export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;

  const hashIndex = trimmed.indexOf("#");
  const pathPart = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  const hashPart = hashIndex >= 0 ? trimmed.slice(hashIndex + 1) : null;

  if (
    pathPart.startsWith("/login") ||
    pathPart.startsWith("/signup") ||
    pathPart.startsWith("/callback")
  ) {
    return null;
  }

  if (hashPart !== null && hashPart !== "" && !/^[a-zA-Z0-9_-]+$/.test(hashPart)) {
    return null;
  }

  if (hashPart) {
    return `${pathPart}#${hashPart}`;
  }
  return pathPart;
}

export function safeRedirectFragment(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const fragment = raw.replace(/^#/, "").trim();
  if (!fragment || !/^[a-zA-Z0-9_-]+$/.test(fragment)) return null;
  return fragment;
}

export function applyRedirectFragment(
  redirectPath: string | null,
  fragment: string | null,
): string | null {
  if (!redirectPath) return null;
  if (redirectPath.includes("#")) return redirectPath;
  if (!fragment) return redirectPath;
  return `${redirectPath}#${fragment}`;
}

export function resolveDestinoTrasLogin(
  redirectPath: string | null,
  fragment: string | null,
  fallback: string,
): string {
  const conFragmento = applyRedirectFragment(redirectPath, fragment);
  if (conFragmento) return conFragmento;
  return fallback;
}

export function guardarRedirectPostLogin(pendiente: PostLoginRedirectPendiente): void {
  if (typeof window === "undefined") return;
  if (!pendiente.path && !pendiente.fragment) return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(pendiente));
}

export function leerRedirectPostLogin(): PostLoginRedirectPendiente | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PostLoginRedirectPendiente;
    return {
      path: safeRedirectPath(parsed.path),
      fragment: safeRedirectFragment(parsed.fragment),
    };
  } catch {
    return null;
  }
}

export function limpiarRedirectPostLogin(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SESSION_KEY);
}

export function construirUrlLoginConRetorno(
  pathname: string,
  search = "",
  fragment?: string | null,
): string {
  const redirect = buildMiddlewareLoginRedirect(pathname, search);
  const params = new URLSearchParams();
  params.set("redirect", redirect);
  const frag = safeRedirectFragment(fragment ?? null);
  if (frag) params.set("fragment", frag);
  return `/login?${params.toString()}`;
}
