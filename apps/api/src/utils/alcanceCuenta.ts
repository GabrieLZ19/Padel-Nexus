export type AccionSobreTorneo = "ver" | "editar" | "eliminar" | "resultados";

export interface ContextoCuenta {
  rol: string;
  provincia: string | null;
  clubId: string | null;
}

export interface TorneoAlcance {
  alcance: string | null;
  clubId: string | null;
  provinciaClub: string | null;
}

export interface DecisionAlcance {
  permitido: boolean;
  soloLectura: boolean;
  puedeCargarResultados: boolean;
  motivo: string | null;
}

const ROLES_TOTALES = new Set(["superadmin", "admin", "admin_federacion"]);

export const AVISO_SIN_PROVINCIA =
  "Tu cuenta no tiene una provincia asignada. Pedile a la federación nacional que te vincule la asociación.";

export const AVISO_SIN_CLUB =
  "Tu cuenta no tiene un club asignado. Pedile a la federación que te vincule el club.";

export function normalizarProvincia(valor: string | null | undefined): string {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function mismaProvincia(
  izquierda: string | null | undefined,
  derecha: string | null | undefined,
): boolean {
  const a = normalizarProvincia(izquierda);
  const b = normalizarProvincia(derecha);
  return Boolean(a) && a === b;
}

export function esAlcanceNacional(alcance: string | null | undefined): boolean {
  return String(alcance || "").trim().toLowerCase() === "nacional";
}

function denegado(motivo: string): DecisionAlcance {
  return {
    permitido: false,
    soloLectura: true,
    puedeCargarResultados: false,
    motivo,
  };
}

function permitido(soloLectura: boolean, puedeCargarResultados: boolean): DecisionAlcance {
  return {
    permitido: true,
    soloLectura,
    puedeCargarResultados,
    motivo: null,
  };
}

export function decidirAlcanceTorneo(
  cuenta: ContextoCuenta,
  torneo: TorneoAlcance,
  accion: AccionSobreTorneo,
): DecisionAlcance {
  if (ROLES_TOTALES.has(cuenta.rol)) {
    return permitido(false, true);
  }

  if (cuenta.rol === "admin_provincial") {
    if (!cuenta.provincia) return denegado(AVISO_SIN_PROVINCIA);
    if (esAlcanceNacional(torneo.alcance)) {
      if (accion === "ver") return permitido(true, false);
      return denegado("Un torneo nacional se consulta en modo lectura.");
    }
    if (mismaProvincia(cuenta.provincia, torneo.provinciaClub)) {
      return permitido(false, true);
    }
    return denegado("Este torneo no es de tu provincia.");
  }

  if (cuenta.rol === "admin_club") {
    if (!cuenta.clubId) return denegado(AVISO_SIN_CLUB);
    if (torneo.clubId !== cuenta.clubId) {
      return denegado("Este torneo no se juega en tu club.");
    }
    if (esAlcanceNacional(torneo.alcance)) {
      if (accion === "ver" || accion === "resultados") return permitido(true, true);
      return denegado(
        "En un torneo de otra entidad podés cargar resultados, no editarlo ni eliminarlo.",
      );
    }
    return permitido(false, true);
  }

  if (accion === "ver") return permitido(false, false);
  return denegado("No tenés permiso para esta acción.");
}
