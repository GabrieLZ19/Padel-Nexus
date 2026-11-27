import { supabaseAdmin } from "../config/supabase";
import {
  buildCanchaLabel,
  buildFeedersByMatchNo,
  buildFeedersEliminatoriaDirecta,
  buildOcupadosDesdePartidos,
  equiposDePartido,
  parseFechaPartidoIso,
  parejasProspectivasDesdeFeeders,
  type DisponibilidadTorneo,
  type PartidoParejaHistorial,
  type PartidoProgramable,
  type ProgramacionIssue,
  type RestriccionesJugadorEvento,
} from "./programacionPartidos";
import { esEliminatoriaDirecta } from "./formatoTorneo";
import {
  etiquetaCategoriaEventoTorneo,
  type TorneoCategoriaEvento,
} from "./gruposTorneo";
import type { BoardPartido, ProgramacionBoard } from "../services/programacion.service";
import {
  esModoDescanso,
  minutosDeModoDescanso,
  sugerirCanchasYHoras,
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
  orden_categorias: string[];
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
  orden_categorias: string[];
}

export function resolverOrdenCategoriasEvento(
  torneoIds: string[],
  stored?: unknown,
): string[] {
  const ids = torneoIds.filter(Boolean);
  if (!Array.isArray(stored) || !stored.length) return ids;
  const prefs = stored
    .map((id) => String(id))
    .filter((id) => ids.includes(id));
  return [...prefs, ...ids.filter((id) => !prefs.includes(id))];
}

export async function cargarMetaEvento(
  grupoId: string,
): Promise<EventoProgramacionMeta> {
  const { data: grupo } = await supabaseAdmin
    .from("grupos_torneo")
    .select("id, nombre, programacion_orden_torneo_ids")
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

  const torneoIds = (torneos as TorneoEnEvento[]).map((t) => t.id);
  return {
    grupo_id: grupoId,
    evento_nombre: grupo?.nombre ? String(grupo.nombre) : null,
    torneos: torneos as TorneoEnEvento[],
    orden_categorias: resolverOrdenCategoriasEvento(
      torneoIds,
      grupo?.programacion_orden_torneo_ids,
    ),
  };
}

/** Slots ya ocupados por otras categorías del mismo evento (para auto-asignar / generar cuadros). */
export async function ocupadosSemillaEventoParaTorneo(
  torneoId: string,
): Promise<Set<string>> {
  const { data: torneo } = await supabaseAdmin
    .from("torneos")
    .select("grupo_id")
    .eq("id", torneoId)
    .maybeSingle();
  const grupoId = torneo?.grupo_id ? String(torneo.grupo_id) : "";
  if (!grupoId) return new Set();

  const partidos = await cargarPartidosProgramablesEvento(grupoId);
  const otros = partidos.filter(
    (p) =>
      String(p.torneo_id) !== String(torneoId) &&
      p.cancha_asignada &&
      p.fecha_partido,
  );
  return buildOcupadosDesdePartidos(otros);
}

export function mergeOcupadosSemilla(
  ...sets: Array<Set<string> | undefined | null>
): Set<string> {
  const out = new Set<string>();
  for (const s of sets) {
    if (!s) continue;
    for (const k of s) out.add(k);
  }
  return out;
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

async function feedersPorTorneoEvento(
  torneoId: string,
  partidosTorneo: PartidoProgramable[],
): Promise<Map<number, number[]>> {
  const { data: torneo } = await supabaseAdmin
    .from("torneos")
    .select("formato")
    .eq("id", torneoId)
    .maybeSingle();
  if (esEliminatoriaDirecta(torneo?.formato)) {
    return buildFeedersEliminatoriaDirecta(partidosTorneo);
  }
  const { resolveFapPlantillaPairCount } = await import("./fapPlantillaTorneo");
  const { getFapBracketForPairCount } = await import("./fapBracketMatrices");
  const pairCount = await resolveFapPlantillaPairCount(torneoId);
  const matrix = getFapBracketForPairCount(pairCount);
  if (matrix?.length) return buildFeedersByMatchNo(matrix);
  return buildFeedersEliminatoriaDirecta(partidosTorneo);
}

function usuariosDesdeInscripciones(
  inscripcionIds: string[],
  jugadoresPorInscripcion: Map<string, string[]>,
): string[] {
  const usuarios = new Set<string>();
  for (const inscId of inscripcionIds) {
    for (const uid of jugadoresPorInscripcion.get(inscId) || []) {
      usuarios.add(uid);
    }
  }
  return [...usuarios];
}

/** Resuelve jugadores (usuario_id) de cada partido vía inscripciones del evento. */
export async function mapaJugadoresUsuarioPorPartidoEvento(
  partidosEvento: PartidoProgramable[],
): Promise<Map<string, string[]>> {
  const inscIds = new Set<string>();
  for (const p of partidosEvento) {
    for (const id of equiposDePartido(p)) inscIds.add(id);
  }

  const porTorneo = new Map<string, PartidoProgramable[]>();
  for (const p of partidosEvento) {
    const tid = String((p as { torneo_id?: string }).torneo_id || "");
    if (!tid) continue;
    const list = porTorneo.get(tid) || [];
    list.push(p);
    porTorneo.set(tid, list);
  }

  for (const [torneoId, lista] of porTorneo) {
    const feeders = await feedersPorTorneoEvento(torneoId, lista);
    for (const p of lista) {
      if (equiposDePartido(p).length) continue;
      if (/^ZONA\s+/i.test(String(p.ronda || ""))) continue;
      for (const inscId of parejasProspectivasDesdeFeeders(p, lista, feeders)) {
        inscIds.add(inscId);
      }
    }
  }

  const jugadoresPorInscripcion = new Map<string, string[]>();
  if (inscIds.size > 0) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select("id, usuario_id, usuario2_id")
      .in("id", [...inscIds]);
    if (error) throw new Error(error.message);
    for (const row of data || []) {
      const usuarios = [row.usuario_id, row.usuario2_id]
        .filter((id): id is string => Boolean(id))
        .map(String);
      jugadoresPorInscripcion.set(String(row.id), usuarios);
    }
  }

  const porPartido = new Map<string, string[]>();
  for (const p of partidosEvento) {
    let inscripciones = equiposDePartido(p);
    if (!inscripciones.length) {
      const tid = String((p as { torneo_id?: string }).torneo_id || "");
      const lista = tid ? porTorneo.get(tid) || [] : [];
      if (lista.length) {
        const feeders = await feedersPorTorneoEvento(tid, lista);
        inscripciones = parejasProspectivasDesdeFeeders(p, lista, feeders);
      }
    }
    const jugadores = new Set<string>();
    for (const inscId of inscripciones) {
      for (const uid of usuariosDesdeInscripciones(
        [inscId],
        jugadoresPorInscripcion,
      )) {
        jugadores.add(uid);
      }
    }
    porPartido.set(String(p.id), [...jugadores]);
  }
  return porPartido;
}

/** Mapa inscripción → usuario(s) para descanso en auto-asignador (CLI-10). */
export async function mapaJugadoresPorInscripcion(
  inscripcionIds: Iterable<string>,
): Promise<Map<string, string[]>> {
  const ids = [...new Set([...inscripcionIds].map(String))].filter(Boolean);
  const map = new Map<string, string[]>();
  if (!ids.length) return map;
  const { data, error } = await supabaseAdmin
    .from("inscripciones")
    .select("id, usuario_id, usuario2_id")
    .in("id", ids);
  if (error) throw new Error(error.message);
  for (const row of data || []) {
    map.set(
      String(row.id),
      [row.usuario_id, row.usuario2_id]
        .filter((id): id is string => Boolean(id))
        .map(String),
    );
  }
  return map;
}

export async function restriccionesJugadorEventoParaAutoAsignar(
  torneoId: string,
  grupoId: string,
  partidosLocales: PartidoProgramable[],
  feedersByMatchNo: Map<number, number[]>,
  descansoMinutos: number,
  descansoModo: ModoDescanso,
): Promise<Pick<
  RestriccionesJugadorEvento,
  "historialJugadores" | "jugadoresPorInscripcion"
> | null> {
  if (!grupoId) return null;

  const evento = await cargarPartidosProgramablesEvento(grupoId);
  const merged = evento.map((p) => {
    const local = partidosLocales.find((l) => String(l.id) === String(p.id));
    return local ? { ...p, ...local, torneo_id: String(p.torneo_id) } : p;
  });

  const meta = await cargarMetaEvento(grupoId);
  const duracionMap = new Map(
    meta.torneos.map((t) => [
      t.id,
      Number(t.duracion_partido_minutos || 90),
    ]),
  );

  const jugadoresPorPartido =
    await mapaJugadoresUsuarioPorPartidoEvento(merged);

  const historialJugadores = new Map<string, PartidoParejaHistorial[]>();
  for (const p of merged) {
    if (String(p.torneo_id) === String(torneoId)) continue;
    if (!p.cancha_asignada || !p.fecha_partido) continue;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed) continue;
    const duracion = Math.max(
      30,
      duracionMap.get(String(p.torneo_id)) || 90,
    );
    const entry: PartidoParejaHistorial = {
      fecha: parsed.fecha,
      startMin: parsed.startMin,
      endMin: parsed.startMin + duracion,
    };
    for (const uid of jugadoresPorPartido.get(String(p.id)) || []) {
      const list = historialJugadores.get(uid) || [];
      list.push(entry);
      historialJugadores.set(uid, list);
    }
  }

  const inscIds = new Set<string>();
  for (const p of partidosLocales) {
    for (const id of equiposDePartido(p)) inscIds.add(id);
    if (!equiposDePartido(p).length) {
      for (const id of parejasProspectivasDesdeFeeders(
        p,
        partidosLocales,
        feedersByMatchNo,
      )) {
        inscIds.add(id);
      }
    }
  }

  const jugadoresPorInscripcion =
    await mapaJugadoresPorInscripcion(inscIds);
  if (!historialJugadores.size || !jugadoresPorInscripcion.size) {
    return historialJugadores.size
      ? { historialJugadores, jugadoresPorInscripcion }
      : null;
  }
  return { historialJugadores, jugadoresPorInscripcion };
}

function jugadoresParaSolapeEvento(
  partidoId: string,
  partido: PartidoProgramable,
  jugadoresPorPartido?: Map<string, string[]>,
): string[] {
  const desdeMapa = jugadoresPorPartido?.get(String(partidoId));
  if (desdeMapa?.length) return desdeMapa;
  return equiposDePartido(partido);
}

function duracionPartidoEvento(
  partido: PartidoProgramable & { torneo_id?: string },
  duracionFallback: number,
  duracionPorTorneo?: Map<string, number>,
  fecha?: string,
  duracionPorDia?: Record<string, number>,
  duracionPorDiaPorTorneo?: Map<string, Record<string, number>>,
): number {
  const tid = String(partido.torneo_id || "");
  if (fecha) {
    const delTorneoDia = tid ? duracionPorDiaPorTorneo?.get(tid)?.[fecha] : undefined;
    if (delTorneoDia != null && Number.isFinite(delTorneoDia)) {
      return Math.max(30, delTorneoDia);
    }
    const delDia = duracionPorDia?.[fecha];
    if (delDia != null && Number.isFinite(delDia)) {
      return Math.max(30, delDia);
    }
  }
  const custom = tid ? duracionPorTorneo?.get(tid) : undefined;
  return Math.max(30, custom ?? duracionFallback);
}

export type DisponibilidadEventoInput = {
  club_id: string;
  cancha_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string | null;
  categoria?: string | null;
};

/** Normaliza filas del cliente antes de persistir en cada categoría del evento. */
export function normalizarFilasDisponibilidadEvento(
  filas: Array<Record<string, unknown>>,
): DisponibilidadEventoInput[] {
  return filas
    .map((d) => ({
      club_id: String(d.club_id ?? "").trim(),
      cancha_id: String(d.cancha_id ?? "").trim(),
      fecha: String(d.fecha ?? "").trim(),
      hora_inicio: String(d.hora_inicio ?? "").trim(),
      hora_fin:
        d.hora_fin != null && String(d.hora_fin).trim() !== ""
          ? String(d.hora_fin)
          : null,
      categoria:
        typeof d.categoria === "string" && d.categoria.trim()
          ? d.categoria.trim()
          : null,
    }))
    .filter(
      (r) => r.club_id && r.cancha_id && r.fecha && r.hora_inicio,
    );
}

/**
 * CLI-9: unión de disponibilidad de todas las categorías del evento
 * (para programador individual y auto-asignador).
 */
export async function disponibilidadCompartidaEvento(
  grupoId: string,
  fallback: DisponibilidadTorneo[],
): Promise<DisponibilidadTorneo[]> {
  const meta = await cargarMetaEvento(grupoId);
  const contextos = await Promise.all(
    meta.torneos.map((t) => cargarContextoProgramacion(t.id)),
  );
  const union = unionDisponibilidad(contextos.map((c) => c.disponibilidad));
  return union.length ? union : fallback;
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
    jugadoresPorPartido?: Map<string, string[]>;
    duracionMinutosPorTorneo?: Map<string, number>;
    duracionPorDia?: Record<string, number>;
    duracionPorDiaPorTorneo?: Map<string, Record<string, number>>;
  },
): string | null {
  const targetId = String(partidoId);
  const cancha = String(canchaLabel || "").trim();
  const parsed = parseFechaPartidoIso(fechaIso);
  if (!cancha || !parsed) return "cancha_label y fecha_iso son obligatorios";

  const duracionBase = Math.max(30, opciones.duracionMinutos || 90);
  const descanso = opciones.descansoMinutos ?? 60;

  const draft = partidosEvento.map((p) =>
    String(p.id) === targetId
      ? { ...p, cancha_asignada: cancha, fecha_partido: fechaIso }
      : p,
  );

  const target = draft.find((p) => String(p.id) === targetId);
  if (!target) return "Partido no encontrado";

  const targetTorneoId = String(
    (target as PartidoProgramable & { torneo_id?: string }).torneo_id || "",
  );
  const assigned = draft.filter((p) => p.cancha_asignada && p.fecha_partido);

  for (const p of assigned) {
    const id = String(p.id || "");
    if (!id || id === targetId) continue;
    const otroTorneoId = String(
      (p as PartidoProgramable & { torneo_id?: string }).torneo_id || "",
    );
    if (targetTorneoId && otroTorneoId && targetTorneoId === otroTorneoId) {
      continue;
    }
    const op = parseFechaPartidoIso(String(p.fecha_partido));
    if (!op) continue;
    const tp = parseFechaPartidoIso(fechaIso);
    if (!tp) continue;

    const duracionTarget = duracionPartidoEvento(
      target as PartidoProgramable & { torneo_id?: string },
      duracionBase,
      opciones.duracionMinutosPorTorneo,
      tp.fecha,
      opciones.duracionPorDia,
      opciones.duracionPorDiaPorTorneo,
    );
    const duracionOtro = duracionPartidoEvento(
      p as PartidoProgramable & { torneo_id?: string },
      duracionBase,
      opciones.duracionMinutosPorTorneo,
      op.fecha,
      opciones.duracionPorDia,
      opciones.duracionPorDiaPorTorneo,
    );

    if (
      String(p.cancha_asignada) === cancha &&
      op.fecha === tp.fecha &&
      op.startMin < tp.startMin + duracionTarget &&
      tp.startMin < op.startMin + duracionOtro
    ) {
      return "Cancha ocupada en ese horario (otra categoría del evento)";
    }

    if (op.fecha !== tp.fecha) continue;
    const jugadoresA = jugadoresParaSolapeEvento(
      targetId,
      target,
      opciones.jugadoresPorPartido,
    );
    const jugadoresB = jugadoresParaSolapeEvento(
      id,
      p,
      opciones.jugadoresPorPartido,
    );
    const common = jugadoresA.some((uid) => jugadoresB.includes(uid));
    if (!common) continue;

    const inicioA = tp.startMin;
    const finA = tp.startMin + duracionTarget;
    const inicioB = op.startMin;
    const finB = op.startMin + duracionOtro;

    if (inicioA < finB && inicioB < finA) {
      return "Jugador con partidos simultáneos en otra categoría del evento";
    }

    const gap =
      inicioB >= finA
        ? inicioB - finA
        : inicioA >= finB
          ? inicioA - finB
          : 0;
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

export async function issuesCruzadosEvento(
  partidosEvento: Array<PartidoProgramable & { torneo_id?: string }>,
  duracionPorTorneo: Map<string, number>,
  opciones?: {
    descansoPorTorneo?: Map<string, number>;
    duracionPorDia?: Record<string, number>;
    duracionPorDiaPorTorneo?: Map<string, Record<string, number>>;
  },
): Promise<ProgramacionIssue[]> {
  const issues: ProgramacionIssue[] = [];
  const jugadoresPorPartido =
    await mapaJugadoresUsuarioPorPartidoEvento(partidosEvento);
  const assigned = partidosEvento.filter(
    (p) => p.cancha_asignada && p.fecha_partido,
  );
  for (const p of assigned) {
    const id = String(p.id || "");
    const torneoId = String(p.torneo_id || "");
    const duracion = duracionPorTorneo.get(torneoId) || 90;
    const descanso = opciones?.descansoPorTorneo?.get(torneoId) ?? 60;
    const parsed = parseFechaPartidoIso(String(p.fecha_partido));
    if (!parsed || !id) continue;
    const msg = validarSolapesAgendaCompartida(
      partidosEvento,
      id,
      String(p.cancha_asignada),
      String(p.fecha_partido),
      {
        duracionMinutos: duracion,
        descansoMinutos: descanso,
        jugadoresPorPartido,
        duracionMinutosPorTorneo: duracionPorTorneo,
        duracionPorDia: opciones?.duracionPorDia,
        duracionPorDiaPorTorneo: opciones?.duracionPorDiaPorTorneo,
      },
    );
    if (msg) {
      issues.push({ partido_id: id, severity: "bad", message: msg });
    }
  }

  return issues;
}

export function sugerenciaCapacidadEvento(input: {
  totalPartidos: number;
  duracionMinutos: number;
  diasCount: number;
  canchasCount: number;
}) {
  return sugerirCanchasYHoras({
    partidos: input.totalPartidos,
    duracionMinutos: input.duracionMinutos,
    jornadas: Math.min(4, Math.max(1, input.diasCount || 1)),
    canchasActuales: input.canchasCount,
  });
}

export async function mergeBoardsEvento(
  grupoId: string,
  meta: EventoProgramacionMeta,
  boards: ProgramacionBoard[],
): Promise<ProgramacionBoardEvento> {
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
    meta.torneos.map((t) => {
      const b = boards.find((x) => x.torneo_id === t.id);
      return [
        t.id,
        Number(
          b?.duracion_partido_minutos ||
            t.duracion_partido_minutos ||
            ref.duracion_partido_minutos ||
            90,
        ),
      ];
    }),
  );
  const descansoPorTorneo = new Map<string, number>(
    meta.torneos.map((t) => {
      const b = boards.find((x) => x.torneo_id === t.id);
      if (b && typeof b.descanso_minutos === "number" && Number.isFinite(b.descanso_minutos)) {
        return [t.id, b.descanso_minutos];
      }
      const modo = esModoDescanso(t.descanso_modo) ? t.descanso_modo : "tras_fin_60";
      return [t.id, minutosDeModoDescanso(modo)];
    }),
  );
  const duracionPorDiaPorTorneo = new Map<string, Record<string, number>>();
  for (const b of boards) {
    if (!b.franjas_por_dia) continue;
    const porDia: Record<string, number> = {};
    for (const [f, fr] of Object.entries(b.franjas_por_dia)) {
      if (fr.duracion != null && Number.isFinite(fr.duracion)) {
        porDia[f] = fr.duracion;
      }
    }
    if (Object.keys(porDia).length > 0) {
      duracionPorDiaPorTorneo.set(b.torneo_id, porDia);
    }
  }
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
  const cruzados = await issuesCruzadosEvento(progEvento, duracionMap, {
    descansoPorTorneo,
    duracionPorDiaPorTorneo,
  });
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
  const sugerencia = sugerenciaCapacidadEvento({
    totalPartidos: total,
    duracionMinutos: Number(ref.duracion_partido_minutos || 90),
    diasCount: dias.length,
    canchasCount: canchasMap.size,
  });

  const todosPublicados =
    boards.length > 0 &&
    boards.every((b) => b.programacion_estado === "publicado");
  const estadoEventoProgramacion = todosPublicados
    ? "publicado"
    : boards.some((b) => b.programacion_estado === "programado")
      ? "programado"
      : ref.programacion_estado;

  return {
    modo: "evento",
    grupo_id: grupoId,
    evento_nombre: meta.evento_nombre,
    torneo_referencia_id: ref.torneo_id,
    torneos: meta.torneos,
    estado: ref.estado,
    programacion_estado: estadoEventoProgramacion,
    programacion_publicada_en: ref.programacion_publicada_en,
    duracion_partido_minutos: ref.duracion_partido_minutos,
    descanso_minutos: ref.descanso_minutos,
    descanso_modo: ref.descanso_modo,
    sugerencia,
    dias,
    canchas: [...canchasMap.values()],
    slots: [...slotsMap.values()].sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora.localeCompare(b.hora) || a.cancha_label.localeCompare(b.cancha_label);
    }),
    franjas_por_dia: ref.franjas_por_dia,
    partidos,
    issues,
    orden_categorias: meta.orden_categorias,
    summary: { total, asignados, pendientes, advertencias },
  };
}

export type IntercambioHorariosPayload = {
  partido_id: string;
  occupant_id: string;
  destino: { fecha_iso: string; cancha_label: string };
  origen?: { fecha_iso: string; cancha_label: string } | null;
};

export function draftIntercambioHorariosEvento(
  partidos: PartidoProgramable[],
  payload: IntercambioHorariosPayload,
): PartidoProgramable[] {
  const { partido_id, occupant_id, destino, origen } = payload;
  return partidos.map((p) => {
    const id = String(p.id || "");
    if (id === partido_id) {
      return {
        ...p,
        cancha_asignada: destino.cancha_label,
        fecha_partido: destino.fecha_iso,
      };
    }
    if (id === occupant_id) {
      if (origen?.fecha_iso && origen?.cancha_label) {
        return {
          ...p,
          cancha_asignada: origen.cancha_label,
          fecha_partido: origen.fecha_iso,
        };
      }
      return {
        ...p,
        cancha_asignada: null,
        fecha_partido: null,
      };
    }
    return p;
  });
}

function duracionPorDiaDesdeDisponibilidad(
  disponibilidad: DisponibilidadTorneo[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of disponibilidad) {
    const fecha = String(row.fecha || "").slice(0, 10);
    const dur = Number(row.duracion_partido_minutos);
    if (fecha && Number.isFinite(dur) && dur >= 30 && dur <= 180) {
      out[fecha] = Math.round(dur);
    }
  }
  return out;
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

  const [partidosEvento, contextos] = await Promise.all([
    cargarPartidosProgramablesEvento(grupoId),
    Promise.all(meta.torneos.map((t) => cargarContextoProgramacion(t.id))),
  ]);
  const duracion = Number(torneo.duracion_partido_minutos || 90);
  const descansoModo = esModoDescanso(torneo.descanso_modo)
    ? torneo.descanso_modo
    : "tras_fin_60";
  const jugadoresPorPartido =
    await mapaJugadoresUsuarioPorPartidoEvento(partidosEvento);
  const duracionMinutosPorTorneo = new Map(
    meta.torneos.map((t) => [
      t.id,
      Number(t.duracion_partido_minutos || 90),
    ]),
  );
  const duracionPorDiaPorTorneo = new Map<string, Record<string, number>>();
  meta.torneos.forEach((t, idx) => {
    const porDia = duracionPorDiaDesdeDisponibilidad(
      contextos[idx]?.disponibilidad || [],
    );
    if (Object.keys(porDia).length > 0) {
      duracionPorDiaPorTorneo.set(t.id, porDia);
    }
  });

  const solape = validarSolapesAgendaCompartida(
    partidosEvento,
    partidoId,
    canchaLabel,
    fechaIso,
    {
      duracionMinutos: duracion,
      descansoMinutos: minutosDeModoDescanso(descansoModo),
      descansoModo,
      jugadoresPorPartido,
      duracionMinutosPorTorneo,
      duracionPorDiaPorTorneo,
    },
  );
  if (solape) return solape;

  const canchasBoard = unionDisponibilidad(
    contextos.map((c) => c.disponibilidad),
  ).map((d) => ({
    label: buildCanchaLabel(d),
    club: d.clubes?.nombre || "",
    cancha: d.canchas?.nombre || "",
    club_id: d.club_id,
    cancha_id: d.cancha_id,
  }));
  const parsedFecha = parseFechaPartidoIso(fechaIso);
  const duracionSlot =
    (parsedFecha?.fecha
      ? duracionPorDiaPorTorneo.get(torneoId)?.[parsedFecha.fecha]
      : undefined) ?? duracion;
  const resolved = resolverCanchaIdDesdeLabel(canchaLabel, canchasBoard);
  if (resolved) {
    const reserva = await validarContraReservasCancha({
      canchaId: resolved.cancha_id,
      clubId: resolved.club_id,
      fechaIso,
      duracionMinutos: duracionSlot,
      excluirPartidoId: partidoId,
    });
    if (reserva) return reserva;
  }

  return null;
}