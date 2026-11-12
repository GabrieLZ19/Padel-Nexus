import { esEmailPlaceholderPlanilla } from "./inscripcionPlanilla";

const NOMBRE_TORNEO_PRUEBA =
  /prue|\bqa\b|testing|\bdemo\b|auditor|^asdf/i;
const EMAIL_PRUEBA = /\.test$|prueba|demo\d|whapy/i;
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
  const email = String(perfil.email || "");
  if (esEmailPlaceholderPlanilla(email)) return false;
  if (EMAIL_PRUEBA.test(email)) return true;
  if (/\.local$/i.test(email)) return true;
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

/**
 * Persiste `es_prueba` en torneos. Los nombres de ensayo nunca se publican.
 * visibleSitioPublico=true => es_prueba false (salvo nombre de prueba).
 */
export function resolverEsPruebaTorneo(
  nombre: string | null | undefined,
  visibleSitioPublico?: boolean | null,
): boolean {
  if (esNombreDePrueba(nombre)) return true;
  if (visibleSitioPublico === true) return false;
  if (visibleSitioPublico === false) return true;
  return false;
}

export function normalizarEsPruebaEnActualizacion(
  nombre: string,
  esPruebaSolicitado: boolean | undefined,
): boolean | undefined {
  if (esNombreDePrueba(nombre)) return true;
  if (esPruebaSolicitado === undefined) return undefined;
  return Boolean(esPruebaSolicitado);
}
