import type { ComunicacionesAudienciaTipo } from "@/utils/types/comunicaciones.types";

/** Audiencia por defecto al abrir el composer según rol administrativo. */
export function audienciaInicialSegunRol(
  rol: string,
): ComunicacionesAudienciaTipo {
  if (rol === "admin_club") return "jugadores_club";
  return "jugadores_provincia";
}

const AUDIENCIAS_CLUB: ComunicacionesAudienciaTipo[] = [
  "jugadores_club",
  "lista",
  "manual_ids",
];

/** Si el rol del club quedó con un tipo de otra entidad, lo realinea. */
export function debeRealinearAudienciaClub(
  rol: string,
  audiencia: ComunicacionesAudienciaTipo,
): boolean {
  if (rol !== "admin_club") return false;
  return !AUDIENCIAS_CLUB.includes(audiencia);
}
