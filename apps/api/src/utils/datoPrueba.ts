const NOMBRE_TORNEO_PRUEBA =
  /prue|\bqa\b|testing|\bdemo\b|auditor|^asdf/i;
const EMAIL_PRUEBA = /\.test$|\.local$|prueba|demo\d|whapy/i;
const NOMBRE_JUGADOR_PRUEBA = /whapy/i;

export function esNombreDePrueba(nombre: string | null | undefined): boolean {
  return NOMBRE_TORNEO_PRUEBA.test(String(nombre || "").trim());
}

export function esJugadorDePrueba(
  perfil:
    | {
        nombre?: string | null;
        apellido?: string | null;
        email?: string | null;
        es_prueba?: boolean | null;
      }
    | null
    | undefined,
): boolean {
  if (!perfil) return false;
  if (perfil.es_prueba) return true;
  if (EMAIL_PRUEBA.test(String(perfil.email || ""))) return true;
  const nombre = `${perfil.nombre || ""} ${perfil.apellido || ""}`;
  return NOMBRE_JUGADOR_PRUEBA.test(nombre);
}

/** El sitio público lista jugadores. Las cuentas de panel no entran en el ranking. */
export function esVisibleEnSitioPublico(
  perfil:
    | {
        nombre?: string | null;
        apellido?: string | null;
        email?: string | null;
        es_prueba?: boolean | null;
        rol?: string | null;
      }
    | null
    | undefined,
): boolean {
  if (!perfil) return false;
  if (perfil.rol && perfil.rol !== "usuario") return false;
  return !esJugadorDePrueba(perfil);
}

export function esTorneoDePrueba(
  torneo:
    | { nombre?: string | null; es_prueba?: boolean | null }
    | null
    | undefined,
): boolean {
  if (!torneo) return false;
  return Boolean(torneo.es_prueba) || esNombreDePrueba(torneo.nombre);
}
