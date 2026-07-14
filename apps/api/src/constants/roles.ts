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

export const esRolAdministrativo = (
  rol: string | null | undefined,
): rol is Exclude<RolUsuario, "usuario"> => {
  return Boolean(rol && ROLES_ADMINISTRATIVOS.includes(rol as RolUsuario));
};
