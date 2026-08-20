import type { RolUsuario } from "../types";

export type RolAdministrativo = Exclude<RolUsuario, "usuario" | "fiscal">;

export const ROLES_ADMINISTRATIVOS = [
  "admin",
  "admin_club",
  "superadmin",
  "admin_federacion",
  "admin_provincial",
] as const satisfies readonly RolAdministrativo[];

/** Club / admin de club: organizan torneos locales y amateur. */
export const ROLES_CLUB = ["admin", "admin_club"] as const satisfies readonly RolAdministrativo[];

/** Federación nacional (y superadmin con mismas reglas de alcance). */
export const ROLES_FEDERACION_NACIONAL = [
  "admin_federacion",
  "superadmin",
] as const satisfies readonly RolAdministrativo[];

export const esRolAdministrativo = (
  rol: RolUsuario | string | null | undefined,
) => (rol ? ROLES_ADMINISTRATIVOS.includes(rol as RolAdministrativo) : false);

export const esRolFiscal = (rol: RolUsuario | string | null | undefined) =>
  rol === "fiscal";

/** Admins del CRM + fiscal (panel operativo, sin config de torneo). */
export const esRolAccesoCrm = (rol: RolUsuario | string | null | undefined) =>
  esRolAdministrativo(rol) || esRolFiscal(rol);

export function destinoPostLogin(rol: RolUsuario | string | null | undefined): string {
  if (rol === "admin_club") return "/club";
  if (esRolAccesoCrm(rol)) return "/dashboard";
  return "/";
}

export const esRolClub = (rol: RolUsuario | string | null | undefined) =>
  Boolean(rol && (ROLES_CLUB as readonly string[]).includes(rol));

export const esRolFederacionNacional = (
  rol: RolUsuario | string | null | undefined,
) => Boolean(rol && (ROLES_FEDERACION_NACIONAL as readonly string[]).includes(rol));

/** Admins autorizados a ver ficha completa de un jugador (contralor). */
export const puedeVerFichaCompleta = (
  rol: RolUsuario | string | null | undefined,
) => esRolAdministrativo(rol);
