import { usuarioPuedeSaldoTorneo } from "./platformFeeOrgUsuario";

export type ActorInscripcion = {
  id: string;
  rol?: string | null;
};

export type InscripcionAutorizacionCampos = {
  usuario_id: string | null;
  usuario2_id: string | null;
  torneo_id: string;
};

/** Jugadores de la pareja, organizador del torneo o superadmin. */
export async function usuarioPuedeCancelarInscripcion(
  user: ActorInscripcion,
  inscripcion: InscripcionAutorizacionCampos,
): Promise<boolean> {
  if (!user.id) return false;
  if (
    inscripcion.usuario_id === user.id ||
    inscripcion.usuario2_id === user.id
  ) {
    return true;
  }
  if (user.rol === "superadmin") return true;
  return usuarioPuedeSaldoTorneo(user, inscripcion.torneo_id);
}

const MENSAJE_JUGADOR1_SESION =
  "No podés inscribir a otro jugador como titular.";

/** FEE-19: el titular de la inscripción pública es siempre el usuario de la sesión. */
export function assertJugador1EsUsuarioSesion(
  sessionUserId: string,
  bodyUsuarioId: unknown,
): void {
  if (
    bodyUsuarioId !== undefined &&
    bodyUsuarioId !== null &&
    String(bodyUsuarioId).trim() !== "" &&
    String(bodyUsuarioId) !== sessionUserId
  ) {
    throw new Error(MENSAJE_JUGADOR1_SESION);
  }
}

export { MENSAJE_JUGADOR1_SESION };

/** Solo organizador del torneo o superadmin (no jugadores ni otras entidades). */
export async function usuarioPuedeActualizarEstadoPagoInscripcion(
  user: ActorInscripcion,
  torneoId: string,
): Promise<boolean> {
  if (!user.id || !torneoId) return false;
  if (user.rol === "superadmin") return true;
  return usuarioPuedeSaldoTorneo(user, torneoId);
}