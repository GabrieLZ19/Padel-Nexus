import { FAP_ESTADOS_TORNEO } from "../constants/fap";
import { supabaseAdmin } from "../config/supabase";
import { formatNombreInscripcionJugador } from "./formatNombreInscripcion";

export type ResumenSyncNombresInscripciones = {
  jugador1_actualizadas: number;
  jugador2_actualizadas: number;
};

/**
 * ENT-39: al corregir nombre/apellido en la ficha, actualiza las inscripciones
 * en torneos que aún no están finalizados.
 */
export async function sincronizarNombresInscripcionesJugador(
  usuarioId: string,
  perfil: { nombre?: string | null; apellido?: string | null },
): Promise<ResumenSyncNombresInscripciones> {
  const etiqueta = formatNombreInscripcionJugador(
    perfil.apellido,
    perfil.nombre,
  );

  const { data: torneosActivos, error: errTorneos } = await supabaseAdmin
    .from("torneos")
    .select("id")
    .neq("estado", FAP_ESTADOS_TORNEO.FINALIZADO);

  if (errTorneos) {
    throw new Error(errTorneos.message);
  }

  const torneoIds = (torneosActivos || []).map((t) => String(t.id));
  if (torneoIds.length === 0) {
    return { jugador1_actualizadas: 0, jugador2_actualizadas: 0 };
  }

  const { data: j1, error: errJ1 } = await supabaseAdmin
    .from("inscripciones")
    .update({ jugador1_nombre: etiqueta })
    .eq("usuario_id", usuarioId)
    .in("torneo_id", torneoIds)
    .select("id");

  if (errJ1) {
    throw new Error(errJ1.message);
  }

  const { data: j2, error: errJ2 } = await supabaseAdmin
    .from("inscripciones")
    .update({ jugador2_nombre: etiqueta })
    .eq("usuario2_id", usuarioId)
    .in("torneo_id", torneoIds)
    .select("id");

  if (errJ2) {
    throw new Error(errJ2.message);
  }

  return {
    jugador1_actualizadas: j1?.length ?? 0,
    jugador2_actualizadas: j2?.length ?? 0,
  };
}