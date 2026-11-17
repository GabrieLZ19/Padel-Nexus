import { getApiUpstreamUrl } from "@/utils/bff/upstream";

export type SesionVerificada = {
  role: string;
};

type PerfilMeResponse = {
  exito?: boolean;
  data?: { rol?: string };
};

/** Valida el JWT contra el backend antes de fijar cookies HttpOnly (PUB-24). */
export async function validateSessionToken(
  token: string,
): Promise<SesionVerificada | null> {
  const upstream = getApiUpstreamUrl();
  try {
    const res = await fetch(`${upstream}/perfil/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as PerfilMeResponse;
    const rol = body.data?.rol?.trim();
    if (!body.exito || !rol) {
      return null;
    }
    return { role: rol };
  } catch {
    return null;
  }
}