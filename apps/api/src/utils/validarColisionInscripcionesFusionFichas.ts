import { FAP_ESTADOS_TORNEO } from "../constants/fap";
import { supabaseAdmin } from "../config/supabase";

export type ColisionInscripcionFusion = {
  torneo_id: string;
  torneo_nombre: string;
  inscripcion_origen_id: string;
  inscripcion_destino_id: string;
  pareja_origen: string;
  pareja_destino: string;
};

export class ErrorColisionInscripcionesFusion extends Error {
  readonly statusCode = 400;
  readonly conflictos: ColisionInscripcionFusion[];

  constructor(conflictos: ColisionInscripcionFusion[]) {
    const lineas = conflictos.map(
      (c) =>
        `Torneo "${c.torneo_nombre}": origen (${c.pareja_origen}) y destino (${c.pareja_destino}).`,
    );
    super(
      `No se pueden unir las fichas: hay inscripciones activas en el mismo torneo. ${lineas.join(" ")}`,
    );
    this.name = "ErrorColisionInscripcionesFusion";
    this.conflictos = conflictos;
  }
}

function etiquetaPareja(ins: {
  jugador1_nombre?: string | null;
  jugador2_nombre?: string | null;
}): string {
  const j1 = (ins.jugador1_nombre || "").trim() || "Jugador 1";
  const j2 = (ins.jugador2_nombre || "").trim();
  return j2 ? `${j1} / ${j2}` : j1;
}

/**
 * ENT-47: bloquea la fusión si origen y destino están inscriptos en el mismo torneo no finalizado.
 */
export async function assertSinColisionInscripcionesFusionFichas(
  origenId: string,
  destinoId: string,
): Promise<void> {
  if (origenId === destinoId) {
    throw new Error("No podés unir una ficha consigo misma.");
  }

  const { data: torneosActivos, error: errTorneos } = await supabaseAdmin
    .from("torneos")
    .select("id, nombre")
    .neq("estado", FAP_ESTADOS_TORNEO.FINALIZADO);

  if (errTorneos) {
    throw new Error(errTorneos.message);
  }

  const torneoIds = (torneosActivos || []).map((t) => String(t.id));
  if (torneoIds.length === 0) return;

  const nombresTorneo = new Map(
    (torneosActivos || []).map((t) => [String(t.id), String(t.nombre || "Torneo")]),
  );

  const { data: insOrigen, error: errO } = await supabaseAdmin
    .from("inscripciones")
    .select("id, torneo_id, jugador1_nombre, jugador2_nombre")
    .or(`usuario_id.eq.${origenId},usuario2_id.eq.${origenId}`)
    .in("torneo_id", torneoIds);

  if (errO) throw new Error(errO.message);
  if (!insOrigen?.length) return;

  const { data: insDestino, error: errD } = await supabaseAdmin
    .from("inscripciones")
    .select("id, torneo_id, jugador1_nombre, jugador2_nombre")
    .or(`usuario_id.eq.${destinoId},usuario2_id.eq.${destinoId}`)
    .in("torneo_id", torneoIds);

  if (errD) throw new Error(errD.message);

  const destinoPorTorneo = new Map(
    (insDestino || []).map((i) => [String(i.torneo_id), i]),
  );

  const conflictos: ColisionInscripcionFusion[] = [];
  for (const insO of insOrigen) {
    const tid = String(insO.torneo_id);
    const insD = destinoPorTorneo.get(tid);
    if (!insD) continue;
    conflictos.push({
      torneo_id: tid,
      torneo_nombre: nombresTorneo.get(tid) || "Torneo",
      inscripcion_origen_id: String(insO.id),
      inscripcion_destino_id: String(insD.id),
      pareja_origen: etiquetaPareja(insO),
      pareja_destino: etiquetaPareja(insD),
    });
  }

  if (conflictos.length > 0) {
    throw new ErrorColisionInscripcionesFusion(conflictos);
  }
}