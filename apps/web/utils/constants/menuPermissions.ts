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
    "/dashboard/federaciones",
    "/dashboard/asociaciones",
    "/dashboard/clubes",
    "/dashboard/jugadores",
    "/dashboard/fiscales",
    "/dashboard/afiliaciones",
    "/dashboard/rankings",
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
    "/dashboard/afiliaciones",
    "/dashboard/asociaciones",
    "/dashboard/jugadores",
    "/dashboard/fiscales",
    "/dashboard/rankings",
    "/dashboard/estadisticas",
    "/dashboard/chat",
  ],

  // Asociación provincial: gestiona su circuito, no el padrón de otras asociaciones.
  admin_provincial: [
    "/dashboard",
    "/dashboard/torneos",
    "/dashboard/inscripciones",
    "/dashboard/afiliaciones",
    "/dashboard/jugadores",
    "/dashboard/fiscales",
    "/dashboard/rankings",
    "/dashboard/estadisticas",
    "/dashboard/chat",
  ],

  // Admin genérico: acceso operativo básico
  admin: [
    "/dashboard",
    "/dashboard/torneos",
    "/dashboard/inscripciones",
    "/dashboard/afiliaciones",
    "/dashboard/clubes",
    "/dashboard/rankings",
    "/dashboard/chat",
  ],

  fiscal: ["/dashboard", "/dashboard/fiscal/torneos"],
};

interface MenuItem {
  name: string;
  href: string;
  icon: any;
  badge?: number;
}

export interface MenuGroup {
  id: string;
  label: string;
  hrefs: string[];
}

/** Agrupación visual del sidebar de Superadmin. No cambia permisos, solo la presentación. */
export const GRUPOS_MENU_SUPERADMIN: MenuGroup[] = [
  {
    id: "red",
    label: "La red",
    hrefs: [
      "/dashboard/federaciones",
      "/dashboard/asociaciones",
      "/dashboard/clubes",
      "/dashboard/jugadores",
    ],
  },
  {
    id: "competencia",
    label: "Competencia",
    hrefs: [
      "/dashboard/torneos",
      "/dashboard/inscripciones",
      "/dashboard/fiscales",
      "/dashboard/rankings",
    ],
  },
  {
    id: "operacion",
    label: "Operación",
    hrefs: [
      "/dashboard/afiliaciones",
      "/dashboard/marketplace",
      "/dashboard/moderacion",
      "/dashboard/estadisticas",
    ],
  },
];

export const MENU_SUPERADMIN_FIJOS_SUPERIOR = ["/dashboard"];
export const MENU_SUPERADMIN_FIJOS_INFERIOR = [
  "/dashboard/chat",
  "/dashboard/usuarios",
];


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

/** Indica si el rol puede entrar a una ruta del CRM según el mapa de menú. */
export function puedeAccederRutaDashboard(
  rol: RolUsuario | string | null | undefined,
  pathname: string,
): boolean {
  if (!rol) return false;

  const permitidos = MENU_POR_ROL[rol];
  if (!permitidos) return true;

  return permitidos.some((href) => {
    if (pathname === href) return true;
    if (href !== "/dashboard" && pathname.startsWith(`${href}/`)) return true;
    return false;
  });
}
