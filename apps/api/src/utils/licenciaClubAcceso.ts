/**
 * Reglas de lectura de licencia/pagos de club (PUB-15).
 * Un admin_club solo puede acceder al club asignado en su perfil.
 */

export function evaluarParametrosLicenciaClub(
  clubId: string,
  licenciaId: string,
): { status: number; error: string } | null {
  if (!clubId?.trim() || !licenciaId?.trim()) {
    return { status: 400, error: "Club y licencia son obligatorios." };
  }
  return null;
}

export function evaluarAdminClubAccesoLicencia(params: {
  rol?: string;
  clubIdEnUrl: string;
  clubIdDelPerfil: string | null;
}): { status: number; error: string } | null {
  if (params.rol !== "admin_club") {
    return null;
  }
  if (String(params.clubIdDelPerfil || "").trim() !== params.clubIdEnUrl.trim()) {
    return {
      status: 403,
      error: "No podés ver la licencia de otro club.",
    };
  }
  return null;
}
