export type RolUsuario =
  | "usuario"
  | "fiscal"
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

/** Oficial de federación: lectura + carga/validación. No configura torneos. */
export const ROLES_FISCAL: RolUsuario[] = ["fiscal"];

/** Roles que entran al CRM (admins + fiscal). */
export const ROLES_ACCESO_CRM: RolUsuario[] = [
  ...ROLES_ADMINISTRATIVOS,
  "fiscal",
];

export const ROLES_CLUB: RolUsuario[] = ["admin", "admin_club"];

export const ROLES_FEDERACION_NACIONAL: RolUsuario[] = [
  "admin_federacion",
  "superadmin",
];

export const esRolAdministrativo = (
  rol: string | null | undefined,
): rol is Exclude<RolUsuario, "usuario" | "fiscal"> => {
  return Boolean(rol && ROLES_ADMINISTRATIVOS.includes(rol as RolUsuario));
};

export const esRolClub = (rol: string | null | undefined): boolean =>
  Boolean(rol && ROLES_CLUB.includes(rol as RolUsuario));

export const esRolFederacionNacional = (
  rol: string | null | undefined,
): boolean => Boolean(rol && ROLES_FEDERACION_NACIONAL.includes(rol as RolUsuario));

export const esRolFiscal = (rol: string | null | undefined): boolean =>
  Boolean(rol && ROLES_FISCAL.includes(rol as RolUsuario));

export const esRolAccesoCrm = (rol: string | null | undefined): boolean =>
  Boolean(rol && ROLES_ACCESO_CRM.includes(rol as RolUsuario));
