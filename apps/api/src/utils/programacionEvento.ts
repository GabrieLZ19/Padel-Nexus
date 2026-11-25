import { supabaseAdmin } from "../config/supabase";
import {
  buildCanchaLabel,
  equiposDePartido,
  parseFechaPartidoIso,
  type DisponibilidadTorneo,
  type PartidoProgramable,
  type ProgramacionIssue,
} from "./programacionPartidos";
import {
  etiquetaCategoriaEventoTorneo,
  type TorneoCategoriaEvento,
} from "./gruposTorneo";
import type { BoardPartido, ProgramacionBoard } from "../services/programacion.service";
import {
  esModoDescanso,
  minutosDeModoDescanso,
  type ModoDescanso,
} from "./programadorReglas";
import { cargarContextoProgramacion } from "./programacionPartidos";

const COLORES_CATEGORIA = [
  "#CBFE01",
  "#60A5FA",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#34D399",
  "#FB7185",
  "#38BDF8",
  "#E879F9",
  "#4ADE80",
] as const;

export interface TorneoEnEvento {
  id: string;
  nombre: string;
  nivel?: string | null;
  rama?: string | null;
  categoria?: string | null;
  programacion_estado?: string | null;
  duracion_partido_minutos?: number | null;
  descanso_modo?: string | null;
}

export interface EventoProgramacionMeta {
  grupo_id: string;
  evento_nombre: string | null;
  torneos: TorneoEnEvento[];
}

export interface BoardPartidoEvento extends BoardPartido {
  torneo_id: string;
  torneo_nombre: string;
  categoria_etiqueta: string;
  categoria_color: string;
}

export interface ProgramacionBoardEvento extends Omit<
  ProgramacionBoard,
  "partidos" | "torneo_id" | "nombre"
> {
  modo: "evento";
  grupo_id: string;
  evento_nombre: string | null;
  torneo_referencia_id: string;
  torneos: TorneoEnEvento[];
  partidos: BoardPartidoEvento[];
  filtro_categoria?: string;
}

export async function cargarMetaEvento(
  grupoId: string,
): Promise<EventoProgramacionMeta> {
  const { data: grupo } = await supabaseAdmin
    .from("grupos_torneo")
    .select("id, nombre")
    .eq("id", grupoId)
    .maybeSingle();

  const { data: torneos, error } = await supabaseAdmin
    .from("torneos")
    .select(
      "id, nombre, nivel, rama, categoria, programacion_estado, duracion_partido_minutos, descanso_modo",
    )
    .eq("grupo_id", grupoId)
    .order("nivel", { ascending: true });

  if (error) throw new Error(error.message);
  if (!torneos?.length) {
    throw new Error("El evento no tiene competencias asociadas.");
  }

  return {
    grupo_id: grupoId,
    evento_nombre: grupo?.nombre ? String(grupo.nombre) : null,
    torneos: torneos as TorneoEnEvento[],
  };
}

export async function cargarPartidosProgramablesEvento(
  grupoId: string,
): Promise<
  Array<
    PartidoProgramable & {
      torneo_id: string;
    }
  >
> {
  const { data: torneos } = await supabaseAdmin
    .from("torneos")
    .select("id")
    .eq("grupo_id", grupoId);
  const ids = (torneos || []).map((t) => t.id);
  if (!ids.length) return [];

  const { data, error } = await supabaseAdmin
    .from("partidos")
    .select(
      "id, torneo_id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido, horario_bloqueado",
    )
    .in("torneo_id", ids);

  if (error) throw new Error(error.message);

  return (data || []).map((p) => ({
    id: p.id,
    torneo_id: String(p.torneo_id),
    ronda: p.ronda || "",
    orden: p.orden ?? undefined,
    equipo_a_id: p.equipo_a_id,
    equipo_b_id: p.equipo_b_id,
    estado_partido: p.estado_partido || "Programado",
    cancha_asignada: p.cancha_asignada,
    fecha_partido: p.fecha_partido,
    horario_bloqueado: p.horario_bloqueado,
  }));
}

export function unionDisponibilidad(
  listas: DisponibilidadTorneo[][],
): DisponibilidadTorneo[] {
  const map = new Map<string, DisponibilidadTorneo>();
  for (const lista of listas) {
    for (const d of lista) {
      const key = `${d.club_id}|${d.cancha_id}|${d.fecha}|${d.hora_inicio}|${d.hora_fin}`;
      if (!map.has(key)) map.set(key, d);
    }
  }
  return [...map.values()];
}

export function colorCategoriaPorTorneo(
  torneoId: string,
  torneos: TorneoEnEvento[],
): string {
  const idx = torneos.findIndex((t) => t.id === torneoId);
  if (idx < 0) return COLORES_CATEGORIA[0];
  return COLORES_CATEGORIA[idx % COLORES_CATEGORIA.length];
}

export function etiquetaTorneoEvento(t: TorneoEnEvento): string {
  return etiquetaCategoriaEventoTorneo(t as TorneoCategoriaEvento);
}

/**
 * Solapes de cancha y jugador entre categorías del mismo evento (sin mezclar reglas de llave).
 */
export function validarSolapesAgendaCompartida(
  partidosEvento: PartidoProgramable[],
  partidoId: string,
  canchaLabel: string,
  fechaIso: string,
  opciones: {
    duracionMinutos: number;
    descansoMinutos?: number;
    descansoModo?: ModoDescanso;
  },
): string | null {
  const targetId = String(partidoId);
  const cancha = String(canchaLabel || "").trim();
  const parsed = parseFechaPartidoIso(fechaIso);
  if (!cancha || !parsed) return "cancha_label y fecha_iso son obligatorios";

  const duracion = Math.max(30, opciones.duracionMinutos || 90);
  const descanso = opciones.descansoMinutos ?? 60;

  const draft = partidosEvento.map((p) =>
    String(p.id) === targetId
      ? { ...p, cancha_asignada: cancha, fecha_partido: fechaIso }
      : p,
  );

  const target = draft.find((p) => String(p.id) === targetId);
  if (!target) return "Partido no encontrado";

  const assigned = draft.filter((p) => p.cancha_asignada && p.fecha_partido);

  for (const p of assigned) {
    const id = String(p.id || "");
    if (!id || id === targetId) continue;
    const op = parseFechaPartidoIso(String(p.fecha_partido));
    if (!op) continue;
    const tp = parseFechaPartidoIso(fechaIso);
    if (!tp) continue;

    if (
      String(p.cancha_asignada) === cancha &&
      op.fecha === tp.fecha &&
      op.startMin < tp.startMin + duracion &&
      tp.startMin < op.startMin + duracion
    ) {
      return "Cancha ocupada en ese horario (otra categoría del evento)";
    }

    if (op.fecha !== tp.fecha) continue;
    const equiposA = equiposDePartido(target);
    const equiposB = equiposDePartido(p);
    const common = equiposA.some((e) => equiposB.includes(e));
    if (!common) continue;

    if (op.startMin === tp.startMin) {
      return "Jugador con partidos simultáneos en otra categoría del evento";
    }
    const gap = Math.abs(op.startMin - tp.startMin) - duracion;
    if (gap < descanso) {
      return "Descanso insuficiente para un jugador inscripto en otra categoría";
    }
  }

  return null;
}

export async function validarContraReservasCancha(opts: {
  canchaId: string;
  clubId: string;
  fechaIso: string;
  duracionMinutos: number;
  excluirPartidoId?: string;
}): Promise<string | null> {
  const parsed = parseFechaPartidoIso(opts.fechaIso);
  if (!parsed) return null;
  const fecha = parsed.fecha;
  const inicioMin = parsed.startMin;
  const finMin = inicioMin + Math.max(30, opts.duracionMinutos);

  const { data: turnos } = await supabaseAdmin
    .from("turnos")
    .select("id, hora_inicio, hora_fin")
    .eq("cancha_id", opts.canchaId);

  if (!turnos?.length) return null;

  const turnoIds = turnos.map((t) => t.id);
  const { data: reservas } = await supabaseAdmin
    .from("reservas")
    .select("turno_id, estado_reserva, created_at, retiene_hasta")
    .in("turno_id", turnoIds)
    .eq("fecha_reserva", fecha)
    .neq("estado_reserva", "cancelada");

  const toMin = (t: string) => {
    const [h, m] = String(t).slice(0, 5).split(":").map(Number);
    return h * 60 + (m || 0);
  };

  const overlap = (aS: number, aE: number, bS: number, bE: number) =>
    aS < bE && aE > bS;

  const reservaActiva = (r: {
    estado_reserva: string;
    retiene_hasta?: string | null;
  }) => {
    if (r.estado_reserva === "confirmada" || r.estado_reserva === "pagada")
      return true;
    if (r.estado_reserva === "pendiente" && r.retiene_hasta) {
      return new Date(r.retiene_hasta).getTime() > Date.now();
    }
    return false;
  };

  for (const reserva of reservas || []) {
    if (!reservaActiva(reserva)) continue;
    const turno = turnos.find((t) => t.id === reserva.turno_id);
    if (!turno) continue;
    const tS = toMin(String(turno.hora_inicio));
    let tE = toMin(String(turno.hora_fin));
    if (tE <= tS) tE += 1440;
    if (overlap(inicioMin, finMin, tS, tE)) {
      return "La cancha tiene una reserva confirmada en ese horario";
    }
  }

  const { data: bloqueos } = await supabaseAdmin
    .from("bloqueos_disponibilidad")
    .select("hora_inicio, hora_fin, cancha_id")
    .eq("club_id", opts.clubId)
    .eq("activo", true)
    .lte("fecha_inicio", fecha)
    .gte("fecha_fin", fecha);

  for (const bloqueo of bloqueos || []) {
    if (bloqueo.cancha_id && bloqueo.cancha_id !== opts.canchaId) continue;
    const bS = toMin(String(bloqueo.hora_inicio));
    let bE = toMin(String(bloqueo.hora_fin));
    if (bE <= bS) bE += 1440;
    if (overlap(inicioMin, finMin, bS, bE)) {
      return "La cancha está bloqueada en ese horario";
    }
  }

  void opts.excluirPartidoId;
  return null;
}

export function resolverCanchaIdDesdeLabel(
  label: string,
  canchas: ProgramacionBoard["canchas"],
): { cancha_id: string; club_id: string } | null {
  const row = canchas.find((c) => c.label === label);
  if (!row?.cancha_id || !row.club_id) return null;
  return { cancha_id: row.cancha_id, club_id: row.club_id };
}

export function issuesCruzadosEvento(
  partidosEvento: PartidoProgramable[],
  duracionPorTorneo: Map<string, number>,
): ProgramacionIssue[] {
  const issues: ProgramacionIssue[] = [];
  const assigned = partidosEvento.filter(
    (p) => p.cancha_asignada && p.fecha_partido,
  );
  for (const p of assigned) {
    const id = String(p.id || "");
    const torneoId = String((p as { torneo_id?: string }).torneo_id || "");
    const duracion = duracionPorTorneo.get(torneoId) || 90;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed || !id) continue;
    const msg = validarSolapesAgendaCompartida(
      partidosEvento,
      id,
      String(p.cancha_asignada),
      String(p.fecha_partido),
      { duracionMinutos: duracion, descansoMinutos: 60 },
    );
    if (msg) {
      issues.push({ partido_id: id, severity: "bad", message: msg });
    }
  }

  return issues;
}

export function mergeBoardsEvento(
  grupoId: string,
  meta: EventoProgramacionMeta,
  boards: ProgramacionBoard[],
): ProgramacionBoardEvento {
  const ref = boards[0];
  const diasSet = new Set<string>();
  const slotsMap = new Map<string, ProgramacionBoard["slots"][number]>();
  const canchasMap = new Map<string, ProgramacionBoard["canchas"][number]>();
  const partidos: BoardPartidoEvento[] = [];
  const issues: ProgramacionIssue[] = [];
  let asignados = 0;
  let total = 0;

  for (const board of boards) {
    board.dias.forEach((d) => diasSet.add(d));
    for (const s of board.slots) slotsMap.set(s.key, s);
    for (const c of board.canchas) canchasMap.set(c.label, c);
    const torneo = meta.torneos.find((t) => t.id === board.torneo_id);
    const color = colorCategoriaPorTorneo(board.torneo_id, meta.torneos);
    const etiqueta = torneo ? etiquetaTorneoEvento(torneo) : board.nombre;
    for (const p of board.partidos) {
      partidos.push({
        ...p,
        torneo_id: board.torneo_id,
        torneo_nombre: board.nombre,
        categoria_etiqueta: etiqueta,
        categoria_color: color,
      });
      if (p.assigned) asignados += 1;
      total += 1;
    }
    issues.push(...board.issues);
  }

  const duracionMap = new Map(
    meta.torneos.map((t) => [
      t.id,
      Number(t.duracion_partido_minutos || ref.duracion_partido_minutos || 90),
    ]),
  );
  const progEvento = partidos.map((p) => ({
    id: p.id,
    torneo_id: p.torneo_id,
    ronda: p.ronda || "",
    orden: p.orden ?? undefined,
    equipo_a_id: p.equipo_a_id,
    equipo_b_id: p.equipo_b_id,
    estado_partido: p.estado_partido || "Programado",
    cancha_asignada: p.cancha_asignada,
    fecha_partido: p.fecha_partido,
  }));
  const cruzados = issuesCruzadosEvento(progEvento, duracionMap);
  const seen = new Set(issues.map((i) => `${i.partido_id}|${i.message}`));
  for (const i of cruzados) {
    const k = `${i.partido_id}|${i.message}`;
    if (!seen.has(k)) {
      seen.add(k);
      issues.push(i);
    }
  }

  const dias = [...diasSet].sort();
  const pendientes = total - asignados;
  const advertencias = issues.filter((i) => i.severity !== "ok").length;

  return {
    modo: "evento",
    grupo_id: grupoId,
    evento_nombre: meta.evento_nombre,
    torneo_referencia_id: ref.torneo_id,
    torneos: meta.torneos,
    estado: ref.estado,
    programacion_estado: ref.programacion_estado,
    programacion_publicada_en: ref.programacion_publicada_en,
    duracion_partido_minutos: ref.duracion_partido_minutos,
    descanso_minutos: ref.descanso_minutos,
    descanso_modo: ref.descanso_modo,
    sugerencia: ref.sugerencia,
    dias,
    canchas: [...canchasMap.values()],
    slots: [...slotsMap.values()].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora.localeCompare(b.hora) || a.cancha_label.localeCompare(b.cancha_label);
    }),
    franjas_por_dia: ref.franjas_por_dia,
    partidos,
    issues,
    summary: { total, asignados, pendientes, advertencias },
  };
}

export async function validarAsignacionEnEvento(
  grupoId: string,
  partidoId: string,
  canchaLabel: string,
  fechaIso: string,
  torneoId: string,
): Promise<string | null> {
  const meta = await cargarMetaEvento(grupoId);
  const torneo = meta.torneos.find((t) => t.id === torneoId);
  if (!torneo) return "Torneo no pertenece al evento";

  const partidosEvento = await cargarPartidosProgramablesEvento(grupoId);
  const duracion = Number(torneo.duracion_partido_minutos || 90);
  const descansoModo = esModoDescanso(torneo.descanso_modo)
    ? torneo.descanso_modo
    : "tras_fin_60";

  const solape = validarSolapesAgendaCompartida(
    partidosEvento,
    partidoId,
    canchaLabel,
    fechaIso,
    {
      duracionMinutos: duracion,
      descansoMinutos: minutosDeModoDescanso(descansoModo),
      descansoModo,
    },
  );
  if (solape) return solape;

  const contextos = await Promise.all(
    meta.torneos.map((t) => cargarContextoProgramacion(t.id)),
  );
  const canchasBoard = unionDisponibilidad(
    contextos.map((c) => c.disponibilidad),
  ).map((d) => ({
    label: buildCanchaLabel(d),
    club: d.clubes?.nombre || "",
    cancha: d.canchas?.nombre || "",
    club_id: d.club_id,
    cancha_id: d.cancha_id,
  }));
  const resolved = resolverCanchaIdDesdeLabel(canchaLabel, canchasBoard);
  if (resolved) {
    const reserva = await validarContraReservasCancha({
      canchaId: resolved.cancha_id,
      clubId: resolved.club_id,
      fechaIso,
      duracionMinutos: duracion,
      excluirPartidoId: partidoId,
    });
    if (reserva) return reserva;
  }

  return null;
}