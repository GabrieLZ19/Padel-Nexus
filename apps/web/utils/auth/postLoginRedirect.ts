const SESSION_KEY = "padel_post_login_redirect";

/** Coincide con `id="notificaciones"` en ajustes de perfil. */
export const SECCION_AJUSTES_NOTIFICACIONES = "notificaciones";

const RUTA_AJUSTES_PERFIL = "/mi-perfil/ajustes";

function splitPathAndSearch(pathWithSearch: string): {
  path: string;
  search: string;
} {
  const q = pathWithSearch.indexOf("?");
  if (q < 0) return { path: pathWithSearch, search: "" };
  return {
    path: pathWithSearch.slice(0, q),
    search: pathWithSearch.slice(q + 1),
  };
}

/**
 * Tras login, los hashes no sobreviven al middleware: usamos query ?seccion= para
 * scroll en ajustes (ENT-28). También convierte #notificaciones legado.
 */
export function normalizarDestinoConSeccion(destino: string): string {
  const hashIndex = destino.indexOf("#");
  const pathWithSearch = hashIndex >= 0 ? destino.slice(0, hashIndex) : destino;
  const hash = hashIndex >= 0 ? destino.slice(hashIndex + 1) : null;
  const { path, search } = splitPathAndSearch(pathWithSearch);
  if (path !== RUTA_AJUSTES_PERFIL) return destino;

  const params = new URLSearchParams(search);
  const seccionDesdeQuery = params.get("seccion");
  const seccionDesdeHash =
    hash && safeRedirectFragment(hash) === SECCION_AJUSTES_NOTIFICACIONES
      ? SECCION_AJUSTES_NOTIFICACIONES
      : null;
  const seccion = seccionDesdeQuery || seccionDesdeHash;

  if (seccion !== SECCION_AJUSTES_NOTIFICACIONES) {
    return hashIndex >= 0 ? pathWithSearch : destino;
  }

  params.set("seccion", SECCION_AJUSTES_NOTIFICACIONES);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

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
  const base = conFragmento || fallback;
  return normalizarDestinoConSeccion(base);
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
