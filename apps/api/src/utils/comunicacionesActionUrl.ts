export function hostnameSinWww(hostname: string): string {
  return hostname.replace(/^www\./i, "").toLowerCase();
}

/** Hosts del frontend Padel Nexus (URLs absolutas se normalizan a ruta relativa). */
export function esHostFrontendPadelNexus(hostname: string): boolean {
  const host = hostnameSinWww(hostname);
  if (host === "localhost" || host === "127.0.0.1") {
    return true;
  }
  if (host === "padelnexus.netlify.app") {
    return true;
  }
  if (host === "padelnexus.app" || host.endsWith(".padelnexus.app")) {
    return true;
  }
  const frontend = process.env.FRONTEND_URL?.trim();
  if (frontend) {
    try {
      const fromEnv = hostnameSinWww(new URL(frontend).hostname);
      return host === fromEnv;
    } catch {
      // ignore
    }
  }
  return false;
}

/**
 * Acepta rutas relativas (/ranking) o URLs absolutas http(s).
 * Si el host es el frontend de la app, se normaliza a ruta relativa.
 */
export function normalizarActionUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) {
    throw new Error(
      "Link inválido. Usá una ruta (/ranking) o una URL completa (https://…).",
    );
  }

  if (/^https?:\/\//i.test(trimmed)) {
    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new Error("Link inválido. Revisá el formato de la URL.");
    }

    if (esHostFrontendPadelNexus(parsed.hostname)) {
      const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      return path || "/";
    }

    return trimmed;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}