import { esEmailPlaceholderPlanilla } from "./inscripcionPlanilla";

const NOMBRE_TORNEO_PRUEBA =
  /prue|\bqa\b|\btest\b|testing|\bdemo\b|^asdf/i;
const EMAIL_PRUEBA = /\.test$|@example\.com$|prueba|demo\d|whapy/i;
const NOMBRE_JUGADOR_PRUEBA = /whapy/i;
/** Cuentas y fichas del re-test 24/11 y ensayos explícitos en CRM. */
const NOMBRE_QA_RANKING = /\bqa\s+(prueba|ensayo)\b/i;
/** DNIs reservados para QA (re-test 18/11, 24/11 y 25/11). */
const DNI_QA_RANKING =
  /^(?:990001\d{2}|990003\d{2}|990024(?:0[1-9]|1\d|2\d|3[0-2])|990025\d{2}|990026\d{2})$/;

export function esDniPrueba(dni?: string | null): boolean {
  const texto = String(dni || "").trim();
  if (!texto) return false;
  return DNI_QA_RANKING.test(texto);
}

export function esNombreDePrueba(nombre: string | null | undefined): boolean {
  return NOMBRE_TORNEO_PRUEBA.test(String(nombre || "").trim());
}

export function esJugadorDePrueba(
  perfil:
    | {
        nombre?: string | null;
        apellido?: string | null;
        email?: string | null;
        dni?: string | null;
        es_prueba?: boolean | null;
      }
    | null
    | undefined,
): boolean {
  if (!perfil) return false;
  if (perfil.es_prueba) return true;
  if (esDniPrueba(perfil.dni)) return true;
  const nombre = `${perfil.nombre || ""} ${perfil.apellido || ""}`;
  if (NOMBRE_QA_RANKING.test(nombre)) return true;
  if (NOMBRE_JUGADOR_PRUEBA.test(nombre)) return true;
  const email = String(perfil.email || "");
  if (EMAIL_PRUEBA.test(email)) return true;
  if (esEmailPlaceholderPlanilla(email)) return false;
  if (/\.local$/i.test(email)) return true;
  return false;
}

/** El sitio público lista jugadores. Las cuentas de panel no entran en el ranking. */
export function esVisibleEnSitioPublico(
  perfil:
    | {
        nombre?: string | null;
        apellido?: string | null;
        email?: string | null;
        dni?: string | null;
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

export function esTorneoVisibleEnSitioPublico(
  torneo:
    | {
        nombre?: string | null;
        es_prueba?: boolean | null;
        visible_sitio_publico?: boolean | null;
      }
    | null
    | undefined,
): boolean {
  if (!torneo) return false;
  if (esNombreDePrueba(torneo.nombre)) return false;
  if (torneo.visible_sitio_publico === false) return false;
  return true;
}

/** TOR-56: motivo explícito para exclusion de ranking / avisos en cierre. */
export function motivoExclusionRankingTorneo(
  torneo:
    | { nombre?: string | null; es_prueba?: boolean | null }
    | null
    | undefined,
): string | null {
  if (!torneo) return null;
  if (torneo.es_prueba) {
    return "marcado como torneo de prueba (sin puntos de ranking)";
  }
  if (esNombreDePrueba(torneo.nombre)) {
    return "nombre de ensayo o QA detectado";
  }
  return null;
}

export function esClubDePrueba(
  club:
    | { nombre?: string | null; es_prueba?: boolean | null }
    | null
    | undefined,
): boolean {
  if (!club) return true;
  if (club.es_prueba) return true;
  return esNombreDePrueba(club.nombre);
}

/** RNK-4: solo clubes operativos en listados públicos de ranking. */
export function esClubActivoPublico(
  club: { estado?: string | null } | null | undefined,
): boolean {
  if (!club) return false;
  const estado = String(club.estado ?? "Activo").trim().toLowerCase();
  return estado === "activo";
}

/** Visibilidad en /torneos; los nombres de ensayo nunca se publican. */
export function resolverVisibleSitioPublico(
  nombre: string | null | undefined,
  visibleSitioPublico?: boolean | null,
): boolean {
  if (esNombreDePrueba(nombre)) return false;
  if (visibleSitioPublico === false) return false;
  return true;
}

/** Persiste `es_prueba` (exclusión de ranking); independiente del sitio público. */
export function resolverEsPruebaTorneo(
  nombre: string | null | undefined,
  esPruebaExplicito?: boolean | null,
): boolean {
  if (esNombreDePrueba(nombre)) return true;
  return Boolean(esPruebaExplicito);
}

export function normalizarEsPruebaEnActualizacion(
  nombre: string,
  esPruebaSolicitado: boolean | undefined,
): boolean | undefined {
  if (esNombreDePrueba(nombre)) return true;
  if (esPruebaSolicitado === undefined) return undefined;
  return Boolean(esPruebaSolicitado);
}
