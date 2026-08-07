export type RolUsuario =
  | "usuario"
  | "admin"
  | "admin_club"
  | "admin_provincial"
  | "admin_federacion"
  | "superadmin";

export const ROLES_ADMINISTRATIVOS: RolUsuario[] = [
  "admin",
  "admin_club",
  "superadmin",
  "admin_federacion",
  "admin_provincial",
];

export const ROLES_CLUB: RolUsuario[] = ["admin", "admin_club"];

export const ROLES_FEDERACION_NACIONAL: RolUsuario[] = [
  "admin_federacion",
  "superadmin",
];

export const esRolAdministrativo = (
  rol: string | null | undefined,
): rol is Exclude<RolUsuario, "usuario"> => {
  return Boolean(rol && ROLES_ADMINISTRATIVOS.includes(rol as RolUsuario));
};

export const esRolClub = (rol: string | null | undefined): boolean =>
  Boolean(rol && ROLES_CLUB.includes(rol as RolUsuario));

export const esRolFederacionNacional = (
  rol: string | null | undefined,
): boolean => Boolean(rol && ROLES_FEDERACION_NACIONAL.includes(rol as RolUsuario));
