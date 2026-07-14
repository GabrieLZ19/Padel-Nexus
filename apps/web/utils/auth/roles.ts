import type { RolUsuario } from "../types";

export type RolAdministrativo = Exclude<RolUsuario, "usuario">;

export const ROLES_ADMINISTRATIVOS = [
  "admin",
  "admin_club",
  "superadmin",
  "admin_federacion",
  "admin_provincial",
] as const satisfies readonly RolAdministrativo[];

export const esRolAdministrativo = (
  rol: RolUsuario | string | null | undefined,
) => (rol ? ROLES_ADMINISTRATIVOS.includes(rol as RolAdministrativo) : false);
