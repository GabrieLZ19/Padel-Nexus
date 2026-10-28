import { supabaseAdmin } from "../config/supabase";
import { estadoAlPublicarProgramacion } from "../utils/estadoCompetencia";
import { SocketService } from "./socket.service";
import { getFapBracketForPairCount } from "../utils/fapBracketMatrices";
import {
  asignarHorariosAPartidos,
  buildCanchaLabel,
  buildFeedersByMatchNo,
  buildOcupadosDesdePartidos,
  cargarContextoProgramacion,
  duracionParaFase,
  evaluateProgramacionIssues,
  generarSlotsDesdeSedesYVentana,
  minutosAHoraStrPublic,
  parseFechaPartidoIsoPublic,
  resolverDiasProgramacion,
  slotKey,
  type DisponibilidadTorneo,
  type PartidoProgramable,
  type ProgramacionIssue,
  type SlotProgramacion,
} from "../utils/programacionPartidos";
import {
  esDistribucionProgramacion,
  esModoDescanso,
  esRondaCampeonato,
  etiquetaRondaProgramador,
  jornadasDesdeInicio,
  minutosDeModoDescanso,
  minutosDesdeHora,
  ordenDeAsignacion,
  ordenRondaProgramador,
  sugerirCanchasYHoras,
  type DistribucionProgramacion,
  type ModoDescanso,
} from "../utils/programadorReglas";

const PROGRAMACION_ESTADOS = ["borrador", "programado", "publicado"] as const;
export type ProgramacionEstado = (typeof PROGRAMACION_ESTADOS)[number];

function diasDelContexto(
  contexto: Awaited<ReturnType<typeof cargarContextoProgramacion>>,
  jornadas?: number,
): string[] {
  const dias = resolverDiasProgramacion({
    fecha: contexto.fecha,
    fecha_fin: contexto.fecha_fin,
    dias_juego: contexto.dias_juego,
    disponibilidad: contexto.disponibilidad,
  });
  if (!jornadas || jornadas < 1) return dias;
  const inicio = contexto.fecha || dias[0];
  if (!inicio) return dias;
  return jornadasDesdeInicio(inicio, jornadas);
}

function slotsDesdeContexto(
  contexto: Awaited<ReturnType<typeof cargarContextoProgramacion>>,
  duracionMinutos: number,
  ventana?: {
    jornadas?: number;
    horaInicio?: string;
    horaFin?: string;
    franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
  },
): SlotProgramacion[] {
  const dias = diasDelContexto(contexto, ventana?.jornadas);
  const horaInicioMin = minutosDesdeHora(ventana?.horaInicio) ?? undefined;
  let horaFinMin = minutosDesdeHora(ventana?.horaFin) ?? undefined;
  if (horaFinMin != null) {
    const piso = horaInicioMin ?? 8 * 60;
    if (horaFinMin <= piso) {
      horaFinMin += 1440;
    }
  }
  return generarSlotsDesdeSedesYVentana({
    canchas: contexto.disponibilidad,
    dias,
    duracionMinutos,
    horaInicioMin,
    horaFinMin,
    franjasPorDia: ventana?.franjasPorDia,
  });
}

export interface PartidoProgramado {
  id: string;
  ronda: string | null;
  orden: number | null;
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  estado_partido: string | null;
  cancha_asignada: string | null;
  fecha_partido: string | null;
  horario_bloqueado: boolean;
}

export interface ProgramacionPreview {
  torneo_id: string;
  programacion_estado: ProgramacionEstado;
  partidos: PartidoProgramado[];
  /**
   * Partidos que quedaron sin horario tentativo por falta de disponibilidad
   * o por conflicto de restricciones FAP. El admin debe resolverlos manualmente.
   */
  sin_horario: string[];
}

/**
 * Simula la programacion de todos los partidos de un torneo respetando los
 * `horario_bloqueado = true` (no los toca) y devuelve el resultado sin persistir.
 *
 * Sirve para que el CRM pueda mostrar una previsualizacion antes de publicar.
 */
export class ProgramacionService {
  static async preview(torneoId: string): Promise<ProgramacionPreview> {
    const [{ data: torneo }, { data: partidosDb }, contexto] = await Promise.all([
      supabaseAdmin
        .from("torneos")
        .select("id, programacion_estado")
        .eq("id", torneoId)
        .maybeSingle(),
      supabaseAdmin
        .from("partidos")
        .select(
          "id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido, horario_bloqueado",
        )
        .eq("torneo_id", torneoId),
      cargarContextoProgramacion(torneoId),
    ]);

    if (!torneo) throw new Error("Torneo no encontrado");

    const partidos: PartidoProgramado[] = (partidosDb || []).map((p) => ({
      id: p.id,
      ronda: p.ronda,
      orden: p.orden,
      equipo_a_id: p.equipo_a_id,
      equipo_b_id: p.equipo_b_id,
      estado_partido: p.estado_partido,
      cancha_asignada: p.cancha_asignada,
      fecha_partido: p.fecha_partido,
      horario_bloqueado: Boolean(p.horario_bloqueado),
    }));

    // Sin disponibilidad no podemos programar nada nuevo.
    if (!contexto.disponibilidad.length) {
      return {
        torneo_id: torneoId,
        programacion_estado: (torneo.programacion_estado ||
          "borrador") as ProgramacionEstado,
        partidos,
        sin_horario: partidos
          .filter((p) => !p.fecha_partido || !p.cancha_asignada)
          .map((p) => p.id),
      };
    }

    // Corremos el scheduler en memoria: los partidos bloqueados o los que ya
    // tienen horario cuentan como "ocupados", el resto se propone tentativo.
    const drafts: PartidoProgramable[] = partidos.map((p) => ({
      id: p.id,
      ronda: p.ronda || "",
      orden: p.orden || undefined,
      equipo_a_id: p.equipo_a_id,
      equipo_b_id: p.equipo_b_id,
      estado_partido: p.estado_partido || "Programado",
      cancha_asignada: p.horario_bloqueado ? p.cancha_asignada : null,
      fecha_partido: p.horario_bloqueado ? p.fecha_partido : null,
    }));

    const ocupadosBloqueados = buildOcupadosDesdePartidos(
      drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
    );

    // Separamos zonas (fase corta) de llave (fase larga) para respetar
    // duraciones distintas y feeders.
    const zonasDrafts = drafts.filter((d) =>
      /^ZONA\s+/i.test(String(d.ronda || "")),
    );
    const llaveDrafts = drafts.filter(
      (d) => !/^ZONA\s+/i.test(String(d.ronda || "")),
    );

    // Programamos zonas.
    if (zonasDrafts.length) {
      const dur = duracionParaFase(contexto.duracionMinutos, "zonas");
      const slots = slotsDesdeContexto(contexto, dur);
      asignarHorariosAPartidos(zonasDrafts, slots, ocupadosBloqueados, {
        duracionMinutos: dur,
      });
    }

    // Refrescamos ocupados con los slots que quedaron tomados por zonas.
    const ocupadosDespuesZonas = buildOcupadosDesdePartidos(
      zonasDrafts.filter((d) => d.cancha_asignada && d.fecha_partido),
    );
    for (const k of ocupadosBloqueados) ocupadosDespuesZonas.add(k);

    // Programamos llave (permitirSinEquipos + feeders).
    if (llaveDrafts.length) {
      const pairCount = await this.contarParejasConfirmadas(torneoId);
      const matrix = getFapBracketForPairCount(pairCount) || [];
      const feedersByMatchNo = buildFeedersByMatchNo(matrix);

      const dur = duracionParaFase(contexto.duracionMinutos, "llave");
      const slots = slotsDesdeContexto(contexto, dur);
      asignarHorariosAPartidos(llaveDrafts, slots, ocupadosDespuesZonas, {
        duracionMinutos: dur,
        feedersByMatchNo,
        permitirSinEquipos: true,
      });
    }

    // Volcamos las asignaciones tentativas a la respuesta.
    const draftsById = new Map(
      drafts.map((d) => [d.id as string, d] as const),
    );
    const resultado: PartidoProgramado[] = partidos.map((p) => {
      const d = draftsById.get(p.id);
      if (!d) return p;
      return {
        ...p,
        cancha_asignada: p.horario_bloqueado
          ? p.cancha_asignada
          : (d.cancha_asignada ?? null),
        fecha_partido: p.horario_bloqueado
          ? p.fecha_partido
          : (d.fecha_partido ?? null),
      };
    });

    return {
      torneo_id: torneoId,
      programacion_estado: (torneo.programacion_estado ||
        "borrador") as ProgramacionEstado,
      partidos: resultado,
      sin_horario: resultado
        .filter((p) => !p.fecha_partido || !p.cancha_asignada)
        .map((p) => p.id),
    };
  }

  /**
   * Ejecuta la reprogramacion completa del torneo persistiendo horarios en DB.
   * Respeta `horario_bloqueado = true` (no los mueve).
   *
   * Cuando el torneo ya esta `publicado` exige `motivo`.
   */
  static async reprogramar(
    torneoId: string,
    opciones: { motivo?: string; adminId?: string } = {},
  ): Promise<ProgramacionPreview> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");

    const estado = (torneo.programacion_estado ||
      "borrador") as ProgramacionEstado;
    const motivo = opciones.motivo?.trim() || "";
    if (estado === "publicado" && !motivo) {
      throw new Error(
        "Debes indicar un motivo para reprogramar un torneo publicado.",
      );
    }

    const preview = await this.preview(torneoId);

    // Persistimos: solo los partidos no bloqueados que recibieron un slot.
    const cambios = preview.partidos.filter((p) => !p.horario_bloqueado);
    for (const p of cambios) {
      const payload: Record<string, unknown> = {
        cancha_asignada: p.cancha_asignada,
        fecha_partido: p.fecha_partido,
      };
      if (estado === "publicado" && motivo) {
        payload.horario_motivo_cambio = motivo;
      }
      await supabaseAdmin.from("partidos").update(payload).eq("id", p.id);
    }

    if (estado === "publicado" && motivo && opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "reprogramar_programacion",
        entidad_afectada: torneoId,
        detalles: { motivo, cambios: cambios.length },
      });
    }

    return this.preview(torneoId);
  }

  /**
   * Marca la programacion como publicada al publico. Requiere que todos los
   * partidos "activos" (con equipos definidos) tengan fecha y cancha asignadas.
   */
  static async publicar(
    torneoId: string,
    opciones: { adminId?: string } = {},
  ): Promise<{ ok: true; publicada_en: string; estado: string | null }> {
    const { data: partidos } = await supabaseAdmin
      .from("partidos")
      .select(
        "id, equipo_a_id, equipo_b_id, cancha_asignada, fecha_partido, ronda",
      )
      .eq("torneo_id", torneoId);

    const faltantes = (partidos || []).filter((p) => {
      // Partidos de zona con equipos completos deben tener horario si o si.
      const esZona = /^ZONA\s+/i.test(String(p.ronda || ""));
      const tieneEquipos = Boolean(p.equipo_a_id && p.equipo_b_id);
      // Playoff sin equipos (dependen de clasificados) tambien deberian
      // tener horario tentativo para exponer al publico.
      const requiereHorario = esZona ? tieneEquipos : true;
      if (!requiereHorario) return false;
      return !p.cancha_asignada || !p.fecha_partido;
    });
    if (faltantes.length) {
      throw new Error(
        `No se puede publicar: ${faltantes.length} partido(s) sin horario o cancha asignada.`,
      );
    }

    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");

    const publicadaEn = new Date().toISOString();
    const estadoCompetencia = estadoAlPublicarProgramacion(torneo.estado);
    const cambios: {
      programacion_estado: "publicado";
      programacion_publicada_en: string;
      estado?: string;
    } = {
      programacion_estado: "publicado",
      programacion_publicada_en: publicadaEn,
    };
    if (estadoCompetencia) cambios.estado = estadoCompetencia;

    const { error } = await supabaseAdmin
      .from("torneos")
      .update(cambios)
      .eq("id", torneoId);
    if (error) throw new Error(error.message);

    if (estadoCompetencia) {
      try {
        SocketService.emitirATodos("torneo_actualizado", {
          torneo_id: torneoId,
          estado: estadoCompetencia,
          mensaje: "El torneo pasó a En curso al publicar la programación",
        });
      } catch (e) {
        console.warn("Error al emitir evento websocket de torneo:", e);
      }
    }

    if (opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "publicar_programacion",
        entidad_afectada: torneoId,
        detalles: {
          publicada_en: publicadaEn,
          estado: estadoCompetencia || torneo.estado,
        },
      });
    }

    return {
      ok: true as const,
      publicada_en: publicadaEn,
      estado: estadoCompetencia || torneo.estado,
    };
  }

  private static async contarParejasConfirmadas(
    torneoId: string,
  ): Promise<number> {
    const { count } = await supabaseAdmin
      .from("inscripciones")
      .select("id", { count: "exact", head: true })
      .eq("torneo_id", torneoId)
      .eq("estado_pago", "Confirmado");
    return count ?? 0;
  }

  private static formatNombrePareja(
    j1: string | null | undefined,
    j2: string | null | undefined,
  ): string {
    const a = String(j1 || "").trim();
    const b = String(j2 || "").trim();
    if (a && b) return `${a} / ${b}`;
    return a || b || "";
  }

  private static formatBracketSeed(
    code: string,
    matchNoToCorrelativo?: Map<number, number>,
  ): string {
    const c = String(code || "").trim();
    const w = c.match(/^W(\d+)$/i);
    if (w) {
      const matchNo = Number(w[1]);
      const visibleNum = matchNoToCorrelativo?.get(matchNo) ?? matchNo;
      return `Ganador #${visibleNum}`;
    }
    const seed = c.match(/^(\d+)([A-Z])$/i);
    if (seed) {
      const pos = Number(seed[1]);
      const zona = seed[2].toUpperCase();
      const ordinal =
        pos === 1 ? "1º" : pos === 2 ? "2º" : pos === 3 ? "3º" : `${pos}º`;
      return `${ordinal} Zona ${zona}`;
    }
    return c || "Por definir";
  }

  private static async loadInscripcionLabels(
    torneoId: string,
  ): Promise<Map<string, { label: string }>> {
    const { data } = await supabaseAdmin
      .from("inscripciones")
      .select("id, jugador1_nombre, jugador2_nombre")
      .eq("torneo_id", torneoId);
    const map = new Map<string, { label: string }>();
    for (const ins of data || []) {
      map.set(String(ins.id), {
        label: this.formatNombrePareja(
          ins.jugador1_nombre,
          ins.jugador2_nombre,
        ),
      });
    }
    return map;
  }

  private static async feedersForTorneo(
    torneoId: string,
    pairCount?: number,
  ): Promise<Map<number, number[]>> {
    const totalPairs =
      pairCount !== undefined
        ? pairCount
        : await this.contarParejasConfirmadas(torneoId);
    const matrix = getFapBracketForPairCount(totalPairs) || [];
    return buildFeedersByMatchNo(matrix);
  }

  private static async bracketLabelMap(
    torneoId: string,
    matchNoToCorrelativo?: Map<number, number>,
    pairCount?: number,
  ): Promise<Map<number, { a: string; b: string }>> {
    const totalPairs =
      pairCount !== undefined
        ? pairCount
        : await this.contarParejasConfirmadas(torneoId);
    const matrix = getFapBracketForPairCount(totalPairs) || [];
    const map = new Map<number, { a: string; b: string }>();
    for (const m of matrix) {
      map.set(m.matchNo, {
        a: this.formatBracketSeed(m.a, matchNoToCorrelativo),
        b: this.formatBracketSeed(m.b, matchNoToCorrelativo),
      });
    }
    return map;
  }

  /**
   * Payload completo para el programador visual: slots, partidos, issues.
   */
  static async getBoard(
    torneoId: string,
    opciones: {
      duracionMinutos?: number;
      descansoMinutos?: number;
      descansoModo?: ModoDescanso;
      jornadas?: number;
      horaInicio?: string;
      horaFin?: string;
      franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
    } = {},
  ): Promise<ProgramacionBoard> {
    const [
      { data: torneo },
      { data: partidosDb },
      contexto,
      labels,
      pairCount,
    ] = await Promise.all([
      supabaseAdmin
        .from("torneos")
        .select(
          "id, nombre, programacion_estado, programacion_publicada_en, duracion_partido_minutos, estado",
        )
        .eq("id", torneoId)
        .maybeSingle(),
      supabaseAdmin
        .from("partidos")
        .select(
          "id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido, horario_bloqueado",
        )
        .eq("torneo_id", torneoId)
        .order("orden", { ascending: true }),
      cargarContextoProgramacion(torneoId),
      this.loadInscripcionLabels(torneoId),
      this.contarParejasConfirmadas(torneoId),
    ]);

    if (!torneo) throw new Error("Torneo no encontrado");

    // Construimos mapa correlativo continuo para todo el torneo:
    // Zonas primero (por letra y orden), luego llave (por ronda y orden)
    const zonasDb = (partidosDb || [])
      .filter((p) => /^ZONA\s+/i.test(String(p.ronda || "")))
      .sort((a, b) => {
        const ra = ordenRondaProgramador(a.ronda);
        const rb = ordenRondaProgramador(b.ronda);
        if (ra !== rb) return ra - rb;
        return (a.orden ?? 0) - (b.orden ?? 0);
      });

    const llaveDb = (partidosDb || [])
      .filter((p) => !/^ZONA\s+/i.test(String(p.ronda || "")))
      .sort((a, b) => {
        const ra = ordenRondaProgramador(a.ronda);
        const rb = ordenRondaProgramador(b.ronda);
        if (ra !== rb) return ra - rb;
        return (a.orden ?? 0) - (b.orden ?? 0);
      });

    const correlativoMap = new Map<string, number>();
    const matchNoToCorrelativo = new Map<number, number>();

    zonasDb.forEach((p, idx) => {
      correlativoMap.set(p.id, idx + 1);
    });

    const inicioLlave = zonasDb.length + 1;
    llaveDb.forEach((p, idx) => {
      const num = inicioLlave + idx;
      correlativoMap.set(p.id, num);
      if (p.orden != null) {
        matchNoToCorrelativo.set(Number(p.orden), num);
      }
    });

    const bracketLabels = await this.bracketLabelMap(
      torneoId,
      matchNoToCorrelativo,
      pairCount,
    );

    const duracion =
      opciones.duracionMinutos ||
      Number(torneo.duracion_partido_minutos || contexto.duracionMinutos || 90);
    const descansoModo = esModoDescanso(opciones.descansoModo)
      ? opciones.descansoModo
      : undefined;
    const descanso = descansoModo
      ? minutosDeModoDescanso(descansoModo)
      : (opciones.descansoMinutos ?? 60);

    const dias = diasDelContexto(contexto, opciones.jornadas);

    const slots = generarSlotsDesdeSedesYVentana({
      canchas: contexto.disponibilidad,
      dias,
      duracionMinutos: duracion,
      horaInicioMin: minutosDesdeHora(opciones.horaInicio) ?? undefined,
      horaFinMin: (() => {
        const inicio = minutosDesdeHora(opciones.horaInicio) ?? 8 * 60;
        let fin = minutosDesdeHora(opciones.horaFin);
        if (fin != null && fin <= inicio) {
          fin += 1440;
        }
        return fin ?? undefined;
      })(),
      franjasPorDia: opciones.franjasPorDia,
    });

    const canchasMap = new Map<
      string,
      { label: string; club: string; cancha: string; club_id: string; cancha_id: string }
    >();
    for (const d of contexto.disponibilidad) {
      const label = buildCanchaLabel(d);
      if (!label || canchasMap.has(label)) continue;
      canchasMap.set(label, {
        label,
        club: d.clubes?.nombre || "",
        cancha: d.canchas?.nombre || "",
        club_id: d.club_id,
        cancha_id: d.cancha_id,
      });
    }

    const partidos: BoardPartido[] = (partidosDb || []).map((p) => {
      const esZona = /^ZONA\s+/i.test(String(p.ronda || ""));
      const matrixLabels =
        p.orden != null ? bracketLabels.get(Number(p.orden)) : undefined;
      const labelA =
        (p.equipo_a_id && labels.get(String(p.equipo_a_id))?.label) ||
        (esZona
          ? "Por definir"
          : matrixLabels?.a || "Por definir");
      const labelB =
        (p.equipo_b_id && labels.get(String(p.equipo_b_id))?.label) ||
        (esZona
          ? "Por definir"
          : matrixLabels?.b || "Por definir");
      const assigned = Boolean(p.cancha_asignada && p.fecha_partido);
      let slot_key: string | null = null;
      if (assigned && p.fecha_partido && p.cancha_asignada) {
        const parsed = parseFechaPartidoIsoPublic(String(p.fecha_partido));
        if (parsed) {
          slot_key = slotKey(
            String(p.cancha_asignada),
            parsed.fecha,
            minutosAHoraStrPublic(parsed.startMin),
          );
        }
      }
      return {
        id: p.id,
        ronda: p.ronda,
        ronda_etiqueta: etiquetaRondaProgramador(p.ronda),
        ronda_orden: ordenRondaProgramador(p.ronda),
        orden: correlativoMap.get(p.id) ?? p.orden,
        phase: esZona ? "zones" : "bracket",
        equipo_a_id: p.equipo_a_id,
        equipo_b_id: p.equipo_b_id,
        label_a: labelA || "Por definir",
        label_b: labelB || "Por definir",
        label: `${labelA || "?"} vs ${labelB || "?"}`,
        estado_partido: p.estado_partido,
        cancha_asignada: p.cancha_asignada,
        fecha_partido: p.fecha_partido,
        horario_bloqueado: Boolean(p.horario_bloqueado),
        assigned,
        slot_key,
      };
    });

    const feeders = await this.feedersForTorneo(torneoId, pairCount);
    const drafts: PartidoProgramable[] = partidos.map((p) => ({
      id: p.id,
      ronda: p.ronda || "",
      orden: p.orden || undefined,
      equipo_a_id: p.equipo_a_id,
      equipo_b_id: p.equipo_b_id,
      estado_partido: p.estado_partido,
      cancha_asignada: p.cancha_asignada,
      fecha_partido: p.fecha_partido,
    }));
    const issues = evaluateProgramacionIssues(drafts, {
      duracionMinutos: duracion,
      descansoMinutos: descanso,
      descansoModo,
      fechaInicio: contexto.fecha,
      feedersByMatchNo: feeders,
    });

    const asignados = partidos.filter((p) => p.assigned).length;
    const pendientes = partidos.length - asignados;
    const advertencias = issues.filter((i) => i.severity !== "ok").length;

    const franjasPorDiaMap: Record<string, { inicio: string; fin: string }> = {};
    for (const f of dias) {
      const franjaOpt = opciones.franjasPorDia?.[f];
      if (franjaOpt?.inicio || franjaOpt?.fin !== undefined) {
        franjasPorDiaMap[f] = {
          inicio: franjaOpt.inicio || opciones.horaInicio || "08:00",
          fin: franjaOpt.fin !== undefined ? franjaOpt.fin : (opciones.horaFin || ""),
        };
      } else {
        const d = contexto.disponibilidad.find((c) => c.fecha === f);
        if (d?.hora_inicio || d?.hora_fin) {
          franjasPorDiaMap[f] = {
            inicio: d.hora_inicio ? d.hora_inicio.slice(0, 5) : (opciones.horaInicio || "08:00"),
            fin: d.hora_fin ? (d.hora_fin.startsWith("23:59") || d.hora_fin.startsWith("00:00") ? "00:00" : d.hora_fin.slice(0, 5)) : (opciones.horaFin || ""),
          };
        }
      }
    }

    return {
      torneo_id: torneoId,
      nombre: torneo.nombre || "",
      estado: torneo.estado || null,
      programacion_estado: (torneo.programacion_estado ||
        "borrador") as ProgramacionEstado,
      programacion_publicada_en: torneo.programacion_publicada_en || null,
      duracion_partido_minutos: duracion,
      descanso_minutos: descanso,
      descanso_modo: descansoModo || "tras_fin_60",
      sugerencia: sugerirCanchasYHoras({
        partidos: partidos.length,
        duracionMinutos: duracion,
        jornadas: Math.min(4, Math.max(1, dias.length || opciones.jornadas || 1)),
      }),
      dias,
      canchas: [...canchasMap.values()],
      slots: slots.map((s) => ({
        key: slotKey(s.canchaLabel, s.fecha, s.hora),
        fecha: s.fecha,
        hora: s.hora.slice(0, 5),
        cancha_label: s.canchaLabel,
        fecha_iso: s.fechaIso,
      })),
      franjas_por_dia: franjasPorDiaMap,
      partidos,
      issues,
      summary: { total: partidos.length, asignados, pendientes, advertencias },
    };
  }

  /**
   * Asigna o mueve un partido a un slot. Marca horario_bloqueado=true.
   * Issues no bloquean el persist.
   */
  static async asignar(
    torneoId: string,
    payload: {
      partido_id: string;
      fecha_iso: string;
      cancha_label: string;
      motivo?: string;
      adminId?: string;
    },
  ): Promise<ProgramacionBoard> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");

    const estado = (torneo.programacion_estado ||
      "borrador") as ProgramacionEstado;
    if (estado === "publicado") {
      throw new Error(
        "La programación está publicada. Creá una nueva edición para editar.",
      );
    }

    const { data: partido } = await supabaseAdmin
      .from("partidos")
      .select("id, torneo_id")
      .eq("id", payload.partido_id)
      .eq("torneo_id", torneoId)
      .maybeSingle();
    if (!partido) throw new Error("Partido no encontrado");

    const cancha = String(payload.cancha_label || "").trim();
    const fechaIso = String(payload.fecha_iso || "").trim();
    if (!cancha || !fechaIso) {
      throw new Error("cancha_label y fecha_iso son obligatorios");
    }

    const update: Record<string, unknown> = {
      cancha_asignada: cancha,
      fecha_partido: fechaIso,
      horario_bloqueado: true,
    };
    const motivo = payload.motivo?.trim() || "";
    if (motivo) update.horario_motivo_cambio = motivo;

    const { error } = await supabaseAdmin
      .from("partidos")
      .update(update)
      .eq("id", payload.partido_id);
    if (error) throw new Error(error.message);

    if (estado === "borrador") {
      await supabaseAdmin
        .from("torneos")
        .update({ programacion_estado: "programado" })
        .eq("id", torneoId);
    }

    if (payload.adminId && motivo) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: payload.adminId,
        accion: "asignar_horario_partido",
        entidad_afectada: torneoId,
        detalles: {
          partido_id: payload.partido_id,
          cancha,
          fecha_iso: fechaIso,
          motivo,
        },
      });
    }

    return this.getBoard(torneoId);
  }

  static async desasignar(
    torneoId: string,
    payload: {
      partido_id: string;
      motivo?: string;
      adminId?: string;
    },
  ): Promise<ProgramacionBoard> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");

    const estado = (torneo.programacion_estado ||
      "borrador") as ProgramacionEstado;
    if (estado === "publicado") {
      throw new Error(
        "La programación está publicada. Creá una nueva edición para editar.",
      );
    }

    const { data: partido } = await supabaseAdmin
      .from("partidos")
      .select("id")
      .eq("id", payload.partido_id)
      .eq("torneo_id", torneoId)
      .maybeSingle();
    if (!partido) throw new Error("Partido no encontrado");

    const motivo = payload.motivo?.trim() || "";
    const update: Record<string, unknown> = {
      cancha_asignada: null,
      fecha_partido: null,
      horario_bloqueado: false,
    };
    if (motivo) update.horario_motivo_cambio = motivo;

    const { error } = await supabaseAdmin
      .from("partidos")
      .update(update)
      .eq("id", payload.partido_id);
    if (error) throw new Error(error.message);

    if (payload.adminId && motivo) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: payload.adminId,
        accion: "desasignar_horario_partido",
        entidad_afectada: torneoId,
        detalles: { partido_id: payload.partido_id, motivo },
      });
    }

    return this.getBoard(torneoId);
  }

  /**
   * Quita cancha/horario de todos los partidos (empezar de cero).
   */
  static async limpiar(
    torneoId: string,
    opciones: { motivo?: string; adminId?: string } = {},
  ): Promise<ProgramacionBoard> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");

    const estado = (torneo.programacion_estado ||
      "borrador") as ProgramacionEstado;
    if (estado === "publicado") {
      throw new Error(
        "La programación está publicada. Creá una nueva edición para editar.",
      );
    }

    const { error } = await supabaseAdmin
      .from("partidos")
      .update({
        cancha_asignada: null,
        fecha_partido: null,
        horario_bloqueado: false,
      })
      .eq("torneo_id", torneoId);
    if (error) throw new Error(error.message);

    if (opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "limpiar_programacion",
        entidad_afectada: torneoId,
        detalles: {
          motivo: opciones.motivo?.trim() || "Limpiar programación",
        },
      });
    }

    return this.getBoard(torneoId);
  }

  /**
   * Auto-asignación: no toca horario_bloqueado.
   * estrategia smart|continuous (continuous = mismo algoritmo; smart filtra
   * slots por jornada preferida según orden).
   */
  static async autoAsignar(
    torneoId: string,
    opciones: {
      estrategia?: "smart" | "continuous";
      distribucion?: DistribucionProgramacion;
      duracionMinutos?: number;
      descansoMinutos?: number;
      descansoModo?: ModoDescanso;
      jornadas?: number;
      horaInicio?: string;
      horaFin?: string;
      franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
      motivo?: string;
      adminId?: string;
    } = {},
  ): Promise<ProgramacionBoard> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado, duracion_partido_minutos")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");

    const estado = (torneo.programacion_estado ||
      "borrador") as ProgramacionEstado;
    if (estado === "publicado") {
      throw new Error(
        "La programación está publicada. Creá una nueva edición para editar.",
      );
    }

    const motivo = opciones.motivo?.trim() || "";
    const duracion =
      opciones.duracionMinutos ||
      Number(torneo.duracion_partido_minutos || 90);

    if (opciones.duracionMinutos) {
      await supabaseAdmin
        .from("torneos")
        .update({ duracion_partido_minutos: duracion })
        .eq("id", torneoId);
    }

    const contexto = await cargarContextoProgramacion(torneoId);
    const { data: partidosDb } = await supabaseAdmin
      .from("partidos")
      .select(
        "id, ronda, orden, equipo_a_id, equipo_b_id, estado_partido, cancha_asignada, fecha_partido, horario_bloqueado",
      )
      .eq("torneo_id", torneoId);

    const partidos = partidosDb || [];
    const drafts: PartidoProgramable[] = partidos.map((p) => ({
      id: p.id,
      ronda: p.ronda || "",
      orden: p.orden || undefined,
      equipo_a_id: p.equipo_a_id,
      equipo_b_id: p.equipo_b_id,
      estado_partido: p.estado_partido || "Programado",
      // Solo respetamos bloqueados; el resto se reasigna
      cancha_asignada: p.horario_bloqueado ? p.cancha_asignada : null,
      fecha_partido: p.horario_bloqueado ? p.fecha_partido : null,
      horario_bloqueado: p.horario_bloqueado,
    }));

    const ocupados = buildOcupadosDesdePartidos(
      drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
    );

    const zonasDrafts = drafts.filter((d) =>
      /^ZONA\s+/i.test(String(d.ronda || "")),
    );
    const llaveDrafts = drafts.filter(
      (d) => !/^ZONA\s+/i.test(String(d.ronda || "")),
    );

    if (opciones.franjasPorDia) {
      for (const [fecha, franja] of Object.entries(opciones.franjasPorDia)) {
        if (!fecha) continue;
        const updates: { hora_inicio?: string; hora_fin?: string } = {};
        if (franja.inicio) {
          updates.hora_inicio = `${franja.inicio.slice(0, 5)}:00`;
        }
        if (franja.fin !== undefined && franja.fin !== "") {
          updates.hora_fin = franja.fin === "00:00" ? "23:59:59" : `${franja.fin.slice(0, 5)}:00`;
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from("torneo_canchas_disponibilidad")
            .update(updates)
            .eq("torneo_id", torneoId)
            .eq("fecha", fecha);
        }
      }
    }

    const descansoModo = esModoDescanso(opciones.descansoModo)
      ? opciones.descansoModo
      : undefined;
    const descansoMinutos = descansoModo
      ? minutosDeModoDescanso(descansoModo)
      : (opciones.descansoMinutos ?? 60);

    const distribucion: DistribucionProgramacion = esDistribucionProgramacion(
      opciones.distribucion,
    )
      ? opciones.distribucion
      : opciones.estrategia === "continuous"
        ? "continua"
        : "zonas_primero";
    const ventana = {
      jornadas: opciones.jornadas,
      horaInicio: opciones.horaInicio,
      horaFin: opciones.horaFin,
      franjasPorDia: opciones.franjasPorDia,
    };

    const dias = diasDelContexto(contexto, ventana.jornadas);
    const tieneMultiplesDias = dias.length >= 2;
    const ultimoDia = tieneMultiplesDias ? dias[dias.length - 1] : null;

    if (distribucion === "continua") {
      const feeders = await this.feedersForTorneo(torneoId);
      const allSlots = slotsDesdeContexto(contexto, duracion, ventana);

      if (tieneMultiplesDias && ultimoDia) {
        const slotsPrevios = allSlots.filter((s) => s.fecha !== ultimoDia);
        const slotsUltimoDia = allSlots.filter((s) => s.fecha === ultimoDia);

        const previosDrafts = drafts.filter(
          (d) =>
            /^ZONA\s+/i.test(String(d.ronda || "")) ||
            !esRondaCampeonato(d.ronda),
        );
        const campeonatoDrafts = drafts.filter(
          (d) =>
            !/^ZONA\s+/i.test(String(d.ronda || "")) &&
            esRondaCampeonato(d.ronda),
        );

        if (previosDrafts.length) {
          const ordenadosPrevios = ordenDeAsignacion(previosDrafts, "continua");
          asignarHorariosAPartidos(
            ordenadosPrevios,
            slotsPrevios.length ? slotsPrevios : allSlots,
            ocupados,
            {
              duracionMinutos: duracion,
              descansoMinutos,
              descansoModo,
              feedersByMatchNo: feeders,
              permitirSinEquipos: true,
              distribucion: "continua",
            },
          );
        }

        const ocupadosDespues = buildOcupadosDesdePartidos(
          drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
        );
        for (const k of ocupados) ocupadosDespues.add(k);

        if (campeonatoDrafts.length) {
          const ordenadosCampeonato = ordenDeAsignacion(campeonatoDrafts, "continua");
          const slotsCampeonato = slotsUltimoDia.length ? slotsUltimoDia : allSlots;
          asignarHorariosAPartidos(
            ordenadosCampeonato,
            slotsCampeonato,
            ocupadosDespues,
            {
              duracionMinutos: duracion,
              descansoMinutos,
              descansoModo,
              feedersByMatchNo: feeders,
              permitirSinEquipos: true,
              distribucion: "continua",
            },
          );
        }
      } else {
        const ordenados = ordenDeAsignacion(drafts, "continua");
        asignarHorariosAPartidos(ordenados, allSlots, ocupados, {
          duracionMinutos: duracion,
          descansoMinutos,
          descansoModo,
          feedersByMatchNo: feeders,
          permitirSinEquipos: true,
          distribucion: "continua",
        });
      }
    } else if (zonasDrafts.length || llaveDrafts.length) {
      if (zonasDrafts.length) {
        const dur = duracionParaFase(duracion, "zonas");
        const allSlotsZonas = filtrarSlotsSmart(
          slotsDesdeContexto(contexto, dur, ventana),
          contexto.disponibilidad,
        );

        // Si hay múltiples días, las zonas llenan primero los días previos al último día (ej. Vie y Sáb)
        const slotsZonas =
          tieneMultiplesDias && ultimoDia
            ? allSlotsZonas.filter((s) => s.fecha !== ultimoDia)
            : allSlotsZonas;

        asignarHorariosAPartidos(
          ordenDeAsignacion(zonasDrafts, "zonas_primero"),
          slotsZonas.length ? slotsZonas : allSlotsZonas,
          ocupados,
          {
            duracionMinutos: dur,
            descansoMinutos,
            descansoModo,
          },
        );

        // Si alguna zona no entró en los días previos por falta de capacidad, intentar en el último día
        const sinAsignarZonas = zonasDrafts.filter(
          (d) => !d.cancha_asignada || !d.fecha_partido,
        );
        if (sinAsignarZonas.length && tieneMultiplesDias) {
          const ocupadosHastaAca = buildOcupadosDesdePartidos(
            drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
          );
          for (const k of ocupados) ocupadosHastaAca.add(k);
          asignarHorariosAPartidos(
            sinAsignarZonas,
            allSlotsZonas,
            ocupadosHastaAca,
            {
              duracionMinutos: dur,
              descansoMinutos,
              descansoModo,
            },
          );
        }
      }

      const ocupadosDespues = buildOcupadosDesdePartidos(
        drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
      );
      for (const k of ocupados) ocupadosDespues.add(k);

      if (llaveDrafts.length) {
        const feeders = await this.feedersForTorneo(torneoId);
        const dur = duracionParaFase(duracion, "llave");
        const allSlotsLlave = filtrarSlotsSmart(
          slotsDesdeContexto(contexto, dur, ventana),
          contexto.disponibilidad,
        );

        if (tieneMultiplesDias && ultimoDia) {
          const rondasPrevias = llaveDrafts.filter(
            (d) => !esRondaCampeonato(d.ronda),
          );
          const rondasCampeonato = llaveDrafts.filter(
            (d) => esRondaCampeonato(d.ronda),
          );

          // 1. Rondas previas de llave (16avos, Octavos, Cuartos) en días previos (ej. Sábado)
          if (rondasPrevias.length) {
            const slotsPrevios = allSlotsLlave.filter(
              (s) => s.fecha !== ultimoDia,
            );
            asignarHorariosAPartidos(
              ordenDeAsignacion(rondasPrevias, "zonas_primero"),
              slotsPrevios.length ? slotsPrevios : allSlotsLlave,
              ocupadosDespues,
              {
                duracionMinutos: dur,
                descansoMinutos,
                descansoModo,
                feedersByMatchNo: feeders,
                permitirSinEquipos: true,
              },
            );

            // Refrescamos ocupados con las rondas previas
            const ocupadosConPrevias = buildOcupadosDesdePartidos(
              drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
            );
            for (const k of ocupados) ocupadosConPrevias.add(k);
            for (const k of ocupadosConPrevias) ocupadosDespues.add(k);
          }

          // 2. Llave de campeonato (Semis y Final) en el último día (ej. Domingo)
          if (rondasCampeonato.length) {
            const slotsCampeonato = allSlotsLlave.filter(
              (s) => s.fecha === ultimoDia,
            );
            asignarHorariosAPartidos(
              ordenDeAsignacion(rondasCampeonato, "zonas_primero"),
              slotsCampeonato.length ? slotsCampeonato : allSlotsLlave,
              ocupadosDespues,
              {
                duracionMinutos: dur,
                descansoMinutos,
                descansoModo,
                feedersByMatchNo: feeders,
                permitirSinEquipos: true,
              },
            );

            // Si alguna semifinal o final no cupo en el último día, permitir fallback a todos los slots
            const sinAsignarCamp = rondasCampeonato.filter(
              (d) => !d.cancha_asignada || !d.fecha_partido,
            );
            if (sinAsignarCamp.length) {
              const ocupadosFin = buildOcupadosDesdePartidos(
                drafts.filter((d) => d.cancha_asignada && d.fecha_partido),
              );
              for (const k of ocupados) ocupadosFin.add(k);
              asignarHorariosAPartidos(
                sinAsignarCamp,
                allSlotsLlave,
                ocupadosFin,
                {
                  duracionMinutos: dur,
                  descansoMinutos,
                  descansoModo,
                  feedersByMatchNo: feeders,
                  permitirSinEquipos: true,
                },
              );
            }
          }
        } else {
          asignarHorariosAPartidos(
            ordenDeAsignacion(llaveDrafts, "zonas_primero"),
            allSlotsLlave,
            ocupadosDespues,
            {
              duracionMinutos: dur,
              descansoMinutos,
              descansoModo,
              feedersByMatchNo: feeders,
              permitirSinEquipos: true,
            },
          );
        }
      }
    }

    await Promise.all(
      partidos.map(async (p) => {
        if (p.horario_bloqueado) return;
        const draft = drafts.find((d) => d.id === p.id);
        if (!draft) return;
        const payload: Record<string, unknown> = {
          cancha_asignada: draft.cancha_asignada ?? null,
          fecha_partido: draft.fecha_partido ?? null,
        };
        if (motivo) payload.horario_motivo_cambio = motivo;
        await supabaseAdmin.from("partidos").update(payload).eq("id", p.id);
      }),
    );

    if (estado === "borrador") {
      await supabaseAdmin
        .from("torneos")
        .update({ programacion_estado: "programado" })
        .eq("id", torneoId);
    }

    if (opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "auto_asignar_programacion",
        entidad_afectada: torneoId,
        detalles: {
          distribucion,
          duracion,
          descanso_modo: opciones.descansoModo || null,
          motivo: motivo || null,
        },
      });
    }

    return this.getBoard(torneoId, {
      duracionMinutos: duracion,
      descansoMinutos: opciones.descansoMinutos,
      descansoModo: opciones.descansoModo,
      jornadas: opciones.jornadas,
      horaInicio: opciones.horaInicio,
      horaFin: opciones.horaFin,
      franjasPorDia: opciones.franjasPorDia,
    });
  }

  /**
   * Deja los horarios cargados y el estado en borrador, sin publicarlos.
   */
  static async guardarBorrador(
    torneoId: string,
    opciones: {
      motivo?: string;
      adminId?: string;
      duracionMinutos?: number;
      descansoMinutos?: number;
      descansoModo?: ModoDescanso;
      jornadas?: number;
      horaInicio?: string;
      horaFin?: string;
      franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
    } = {},
  ): Promise<ProgramacionBoard> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");
    if (torneo.programacion_estado === "publicado") {
      throw new Error(
        "La programación está publicada. Creá una nueva edición para editar.",
      );
    }

    if (opciones.franjasPorDia) {
      for (const [fecha, franja] of Object.entries(opciones.franjasPorDia)) {
        if (!fecha) continue;
        const updates: { hora_inicio?: string; hora_fin?: string } = {};
        if (franja.inicio) {
          updates.hora_inicio = `${franja.inicio.slice(0, 5)}:00`;
        }
        if (franja.fin !== undefined && franja.fin !== "") {
          updates.hora_fin = franja.fin === "00:00" ? "23:59:59" : `${franja.fin.slice(0, 5)}:00`;
        }
        if (Object.keys(updates).length > 0) {
          await supabaseAdmin
            .from("torneo_canchas_disponibilidad")
            .update(updates)
            .eq("torneo_id", torneoId)
            .eq("fecha", fecha);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from("torneos")
      .update({ programacion_estado: "borrador" })
      .eq("id", torneoId);
    if (error) throw new Error(error.message);

    if (opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "guardar_borrador_programacion",
        entidad_afectada: torneoId,
        detalles: {
          motivo: opciones.motivo?.trim() || "Guardar borrador de programación",
        },
      });
    }

    return this.getBoard(torneoId, {
      duracionMinutos: opciones.duracionMinutos,
      descansoMinutos: opciones.descansoMinutos,
      descansoModo: opciones.descansoModo,
      jornadas: opciones.jornadas,
      horaInicio: opciones.horaInicio,
      horaFin: opciones.horaFin,
      franjasPorDia: opciones.franjasPorDia,
    });
  }

  /**
   * Publicado → programado para permitir nueva edición manual.
   * El estado de competencia queda en En curso: publicar ya lo abrió.
   */
  static async abrirNuevaEdicion(
    torneoId: string,
    opciones: { motivo?: string; adminId?: string } = {},
  ): Promise<ProgramacionBoard> {
    const { data: torneo } = await supabaseAdmin
      .from("torneos")
      .select("id, programacion_estado")
      .eq("id", torneoId)
      .maybeSingle();
    if (!torneo) throw new Error("Torneo no encontrado");
    if (torneo.programacion_estado !== "publicado") {
      throw new Error("Solo se puede abrir edición si está publicada.");
    }
    const motivo = opciones.motivo?.trim() || "Nueva edición de programación";

    const { error } = await supabaseAdmin
      .from("torneos")
      .update({ programacion_estado: "programado" })
      .eq("id", torneoId);
    if (error) throw new Error(error.message);

    if (opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "nueva_edicion_programacion",
        entidad_afectada: torneoId,
        detalles: { motivo },
      });
    }

    return this.getBoard(torneoId);
  }
}

export interface BoardPartido {
  id: string;
  ronda: string | null;
  ronda_etiqueta: string;
  ronda_orden: number;
  orden: number | null;
  phase: "zones" | "bracket";
  equipo_a_id: string | null;
  equipo_b_id: string | null;
  label_a: string;
  label_b: string;
  label: string;
  estado_partido: string | null;
  cancha_asignada: string | null;
  fecha_partido: string | null;
  horario_bloqueado: boolean;
  assigned: boolean;
  slot_key: string | null;
}

export interface ProgramacionBoard {
  torneo_id: string;
  nombre: string;
  estado: string | null;
  programacion_estado: ProgramacionEstado;
  programacion_publicada_en: string | null;
  duracion_partido_minutos: number;
  descanso_minutos: number;
  descanso_modo: ModoDescanso;
  sugerencia: { canchas: number; horas: number; mensaje: string };
  dias: string[];
  canchas: Array<{
    label: string;
    club: string;
    cancha: string;
    club_id: string;
    cancha_id: string;
  }>;
  slots: Array<{
    key: string;
    fecha: string;
    hora: string;
    cancha_label: string;
    fecha_iso: string;
  }>;
  franjas_por_dia?: Record<string, { inicio: string; fin: string }>;
  partidos: BoardPartido[];
  issues: ProgramacionIssue[];
  summary: {
    total: number;
    asignados: number;
    pendientes: number;
    advertencias: number;
  };
}

/** Prefiere slots de jornadas tempranas para partidos tempranos (smart). */
function filtrarSlotsSmart(
  slots: SlotProgramacion[],
  _disponibilidad: DisponibilidadTorneo[],
): SlotProgramacion[] {
  // Orden natural por fecha/hora ya favorece jornadas tempranas;
  // continuous usa el mismo set — la diferencia está en no saltar huecos
  // (el scheduler ya toma el primer slot libre). Dejamos el set completo
  // ordenado; "smart" prioriza mañana/tarde agrupando por día.
  return [...slots].sort((a, b) => {
    if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
    // Preferir bloques de mañana antes que tarde dentro del día
    const am = (m: number) => (m < 14 * 60 ? 0 : 1);
    const [ah, ami] = a.hora.split(":").map(Number);
    const [bh, bmi] = b.hora.split(":").map(Number);
    const ama = am(ah * 60 + (ami || 0));
    const bmb = am(bh * 60 + (bmi || 0));
    if (ama !== bmb) return ama - bmb;
    return a.hora.localeCompare(b.hora) || a.canchaLabel.localeCompare(b.canchaLabel);
  });
}
