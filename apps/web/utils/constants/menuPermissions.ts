import type { RolUsuario } from "../types/user.types";

/**
 * Mapa de rutas del sidebar permitidas por rol.
 * Cada key es un RolUsuario administrativo y su valor es un array de hrefs autorizados.
 * Si un href no aparece en la lista del rol, el item se oculta del sidebar.
 */
const MENU_POR_ROL: Record<string, string[]> = {
  superadmin: [
    "/dashboard",
    "/dashboard/torneos",
    "/dashboard/inscripciones",
    "/dashboard/clubes",
    "/dashboard/jugadores",
    "/dashboard/marketplace",
    "/dashboard/moderacion",
    "/dashboard/estadisticas",
    "/dashboard/chat",
    "/dashboard/usuarios",
  ],

  admin_federacion: [
    "/dashboard",
    "/dashboard/torneos",
    "/dashboard/inscripciones",
    "/dashboard/clubes",
    "/dashboard/jugadores",
    "/dashboard/estadisticas",
    "/dashboard/chat",
  ],

  admin_provincial: [
    "/dashboard",
    "/dashboard/torneos",
    "/dashboard/inscripciones",
    "/dashboard/clubes",
    "/dashboard/jugadores",
    "/dashboard/estadisticas",
    "/dashboard/chat",
  ],

  // Admin genérico: acceso operativo básico
  admin: [
    "/dashboard",
    "/dashboard/torneos",
    "/dashboard/inscripciones",
    "/dashboard/chat",
  ],
};

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

/**
 * Filtra los items del menú lateral según el rol del usuario.
 * Si el rol no tiene una entrada explícita, devuelve todo el menú (fallback seguro).
 */
export function getMenuItemsPorRol(
  rol: RolUsuario | string | null | undefined,
  items: MenuItem[],
): MenuItem[] {
  if (!rol) return items;

  const permitidos = MENU_POR_ROL[rol];
  if (!permitidos) return items; // Rol desconocido → mostrar todo por seguridad

  return items.filter((item) => permitidos.includes(item.href));
}
