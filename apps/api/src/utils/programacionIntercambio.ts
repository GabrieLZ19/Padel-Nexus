import { supabaseAdmin } from "../config/supabase";
import {
  buildCanchaLabel,
  buildOcupadosDesdePartidos,
  cargarContextoProgramacion,
  duracionParaFase,
  validarAsignacionHorarioPartido,
  type PartidoProgramable,
} from "./programacionPartidos";
import {
  esModoDescanso,
  minutosDeModoDescanso,
} from "./programadorReglas";
import {
  cargarMetaEvento,
  cargarPartidosProgramablesEvento,
  draftIntercambioHorariosEvento,
  mapaJugadoresUsuarioPorPartidoEvento,
  resolverCanchaIdDesdeLabel,
  validarContraReservasCancha,
  validarSolapesAgendaCompartida,
  type IntercambioHorariosPayload,
} from "./programacionEvento";

export type { IntercambioHorariosPayload };

async function cargarPartidosTorneo(
  torneoId: string,
): Promise<PartidoProgramable[]> {
  const { data, error } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido, horario_bloqueado",
    )
    .eq("torneo_id", torneoId);
  if (error) throw new Error(error.message);
  return (data || []).map((p) => ({
    id: p.id,
    ronda: p.ronda || "",
    orden: p.orden || undefined,
    equipo_a_id: p.equipo_a_id,
    equipo_b_id: p.equipo_b_id,
    estado_partido: p.estado_partido || "Programado",
    cancha_asignada: p.cancha_asignada,
    fecha_partido: p.fecha_partido,
    horario_bloqueado: p.horario_bloqueado,
  }));
}

function draftIntercambioTorneo(
  partidos: PartidoProgramable[],
  payload: IntercambioHorariosPayload,
): PartidoProgramable[] {
  return draftIntercambioHorariosEvento(
    partidos.map((p) => ({ ...p, torneo_id: undefined })),
    payload,
  );
}

async function validarReglasTorneoEnDraft(
  torneoId: string,
  partidoId: string,
  draft: PartidoProgramable[],
  fechaInicio: string | null,
): Promise<string | null> {
  const row = draft.find((p) => String(p.id) === partidoId);
  if (!row?.cancha_asignada || !row.fecha_partido) return null;

  const { data: torneo } = await supabaseAdmin
    .from("torneos")
    .select("duracion_partido_minutos, descanso_modo, fecha")
    .eq("id", torneoId)
    .maybeSingle();

  const duracion = Number(
    torneo?.duracion_partido_minutos || 90,
  );
  const descansoModo = esModoDescanso(torneo?.descanso_modo)
    ? torneo.descanso_modo
    : "tras_fin_60";
  const descansoMinutos = minutosDeModoDescanso(descansoModo);
  const { ProgramacionService } = await import("../services/programacion.service");
  const feeders = await ProgramacionService.feedersForTorneo(torneoId);

  return validarAsignacionHorarioPartido(
    draft,
    partidoId,
    String(row.cancha_asignada),
    String(row.fecha_partido),
    {
      duracionMinutos: duracion,
      duracionZonaMinutos: duracionParaFase(duracion, "zonas"),
      descansoMinutos,
      descansoModo,
      feedersByMatchNo: feeders as Map<number, number[]>,
      fechaInicio: fechaInicio ?? torneo?.fecha ?? null,
    },
  );
}

type CanchaBoardRow = Parameters<typeof resolverCanchaIdDesdeLabel>[1][number];

async function validarReservaCancha(
  partidoId: string,
  canchaLabel: string,
  fechaIso: string,
  duracion: number,
  canchasBoard: CanchaBoardRow[],
): Promise<string | null> {
  const resolved = resolverCanchaIdDesdeLabel(canchaLabel, canchasBoard);
  if (!resolved) return null;
  return validarContraReservasCancha({
    canchaId: resolved.cancha_id,
    clubId: resolved.club_id,
    fechaIso,
    duracionMinutos: duracion,
    excluirPartidoId: partidoId,
  });
}

export async function validarIntercambioHorariosTorneo(
  torneoId: string,
  payload: IntercambioHorariosPayload,
): Promise<string | null> {
  const { data: torneo } = await supabaseAdmin
    .from("torneos")
    .select("id, programacion_estado, duracion_partido_minutos, fecha")
    .eq("id", torneoId)
    .maybeSingle();
  if (!torneo) return "Torneo no encontrado";
  if (torneo.programacion_estado === "publicado") {
    return "La programación está publicada. Creá una nueva edición para editar.";
  }

  const partidos = await cargarPartidosTorneo(torneoId);
  const ids = new Set([payload.partido_id, payload.occupant_id]);
  if (![...ids].every((id) => partidos.some((p) => String(p.id) === id))) {
    return "Partido no encontrado en el torneo";
  }

  const draft = draftIntercambioTorneo(partidos, payload);
  const duracion = Number(torneo.duracion_partido_minutos || 90);

  for (const id of ids) {
    const row = draft.find((p) => String(p.id) === id);
    if (!row?.cancha_asignada || !row.fecha_partido) continue;
    const regla = await validarReglasTorneoEnDraft(
      torneoId,
      id,
      draft,
      torneo.fecha ? String(torneo.fecha) : null,
    );
    if (regla) return regla;
  }

  return null;
}

export async function validarIntercambioHorariosEvento(
  grupoId: string,
  payload: IntercambioHorariosPayload,
): Promise<string | null> {
  const meta = await cargarMetaEvento(grupoId);
  const partidosEvento = await cargarPartidosProgramablesEvento(grupoId);
  const ids = new Set([payload.partido_id, payload.occupant_id]);
  const filas = partidosEvento.filter((p) => ids.has(String(p.id)));
  if (filas.length !== 2) return "Partido no pertenece al evento";

  for (const t of meta.torneos) {
    if (filas.some((f) => f.torneo_id === t.id) && t.programacion_estado === "publicado") {
      return "La programación está publicada. Creá una nueva edición para editar.";
    }
  }

  const jugadoresPorPartido =
    await mapaJugadoresUsuarioPorPartidoEvento(partidosEvento);
  const duracionMinutosPorTorneo = new Map(
    meta.torneos.map((t) => [
      t.id,
      Number(t.duracion_partido_minutos || 90),
    ]),
  );

  const draft = draftIntercambioHorariosEvento(partidosEvento, payload);

  for (const id of ids) {
    const row = draft.find((p) => String(p.id) === id);
    if (!row?.cancha_asignada || !row.fecha_partido) continue;

    const torneoId = String(row.torneo_id || "");
    const torneo = meta.torneos.find((t) => t.id === torneoId);
    const duracion = Number(
      torneo?.duracion_partido_minutos || 90,
    );
    const descansoModo = esModoDescanso(torneo?.descanso_modo)
      ? torneo.descanso_modo
      : "tras_fin_60";

    const solape = validarSolapesAgendaCompartida(
      draft,
      id,
      String(row.cancha_asignada),
      String(row.fecha_partido),
      {
        duracionMinutos: duracion,
        descansoMinutos: minutosDeModoDescanso(descansoModo),
        descansoModo,
        jugadoresPorPartido,
        duracionMinutosPorTorneo,
      },
    );
    if (solape) return solape;

    const regla = await validarReglasTorneoEnDraft(
      torneoId,
      id,
      draft.filter((p) => String(p.torneo_id) === torneoId),
      null,
    );
    if (regla) return regla;
  }

  const contextos = await Promise.all(
    meta.torneos.map((t) => cargarContextoProgramacion(t.id)),
  );
  const canchasBoard = contextos.flatMap((c) =>
    c.disponibilidad.map((d) => ({
      label: buildCanchaLabel(d),
      club: d.clubes?.nombre || "",
      cancha: d.canchas?.nombre || "",
      club_id: d.club_id,
      cancha_id: d.cancha_id,
    })),
  );

  for (const id of ids) {
    const row = draft.find((p) => String(p.id) === id);
    if (!row?.cancha_asignada || !row.fecha_partido) continue;
    const torneoId = String(row.torneo_id || "");
    const duracion =
      duracionMinutosPorTorneo.get(torneoId) || 90;
    const reserva = await validarReservaCancha(
      id,
      String(row.cancha_asignada),
      String(row.fecha_partido),
      duracion,
      canchasBoard,
    );
    if (reserva) return reserva;
  }

  return null;
}

type SnapHorario = {
  cancha_asignada: string | null;
  fecha_partido: string | null;
  horario_bloqueado: boolean;
};

async function snapshotHorario(partidoId: string): Promise<SnapHorario> {
  const { data } = await supabaseAdmin
    .from("partidos")
    .select("cancha_asignada, fecha_partido, horario_bloqueado")
    .eq("id", partidoId)
    .maybeSingle();
  return {
    cancha_asignada: data?.cancha_asignada ?? null,
    fecha_partido: data?.fecha_partido ?? null,
    horario_bloqueado: Boolean(data?.horario_bloqueado),
  };
}

async function restaurarHorario(partidoId: string, snap: SnapHorario) {
  await supabaseAdmin
    .from("partidos")
    .update({
      cancha_asignada: snap.cancha_asignada,
      fecha_partido: snap.fecha_partido,
      horario_bloqueado: snap.horario_bloqueado,
    })
    .eq("id", partidoId);
}

export async function aplicarIntercambioHorariosPartidos(
  payload: IntercambioHorariosPayload,
  motivo?: string,
): Promise<void> {
  const { partido_id, occupant_id, destino, origen } = payload;
  const snapA = await snapshotHorario(partido_id);
  const snapB = await snapshotHorario(occupant_id);

  const patchMotivo = motivo?.trim()
    ? { horario_motivo_cambio: motivo.trim() }
    : {};

  try {
    const { error: errA } = await supabaseAdmin
      .from("partidos")
      .update({
        cancha_asignada: destino.cancha_label,
        fecha_partido: destino.fecha_iso,
        horario_bloqueado: true,
        ...patchMotivo,
      })
      .eq("id", partido_id);
    if (errA) throw new Error(errA.message);

    if (origen?.fecha_iso && origen.cancha_label) {
      const { error: errB } = await supabaseAdmin
        .from("partidos")
        .update({
          cancha_asignada: origen.cancha_label,
          fecha_partido: origen.fecha_iso,
          horario_bloqueado: true,
          ...patchMotivo,
        })
        .eq("id", occupant_id);
      if (errB) {
        await restaurarHorario(partido_id, snapA);
        throw new Error(errB.message);
      }
    } else {
      const { error: errB } = await supabaseAdmin
        .from("partidos")
        .update({
          cancha_asignada: null,
          fecha_partido: null,
          horario_bloqueado: false,
          ...patchMotivo,
        })
        .eq("id", occupant_id);
      if (errB) {
        await restaurarHorario(partido_id, snapA);
        throw new Error(errB.message);
      }
    }
  } catch (err) {
    await restaurarHorario(partido_id, snapA);
    await restaurarHorario(occupant_id, snapB);
    throw err;
  }
}

/** Asegura que el set de ocupados refleje el estado persistido tras un intercambio. */
export function ocupadosTrasIntercambio(
  partidos: PartidoProgramable[],
): Set<string> {
  return buildOcupadosDesdePartidos(
    partidos.filter((p) => p.cancha_asignada && p.fecha_partido),
  );
}