import { supabaseAdmin } from "../config/supabase";
import { FAP_ESTADOS_TORNEO } from "../constants/fap";
import { getFapBracketForPairCount } from "../utils/fapBracketMatrices";
import {
  asignarHorariosAPartidos,
  buildFeedersByMatchNo,
  buildOcupadosDesdePartidos,
  cargarContextoProgramacion,
  duracionParaFase,
  expandirSlotsDisponibilidad,
  type PartidoProgramable,
} from "../utils/programacionPartidos";

const PROGRAMACION_ESTADOS = ["borrador", "programado", "publicado"] as const;
export type ProgramacionEstado = (typeof PROGRAMACION_ESTADOS)[number];

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
      const slots = expandirSlotsDisponibilidad(contexto.disponibilidad, dur);
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
      const slots = expandirSlotsDisponibilidad(contexto.disponibilidad, dur);
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
  ): Promise<{ ok: true; publicada_en: string }> {
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

    const publicadaEn = new Date().toISOString();
    const { data: torneoActual } = await supabaseAdmin
      .from("torneos")
      .select("estado")
      .eq("id", torneoId)
      .single();

    const updatePayload: Record<string, string> = {
      programacion_estado: "publicado",
      programacion_publicada_en: publicadaEn,
    };

    // Publicar horarios implica que la competencia arranca / está lista para jugar.
    if (torneoActual?.estado === FAP_ESTADOS_TORNEO.PROGRAMADO) {
      updatePayload.estado = FAP_ESTADOS_TORNEO.EN_CURSO;
    }

    const { error } = await supabaseAdmin
      .from("torneos")
      .update(updatePayload)
      .eq("id", torneoId);
    if (error) throw new Error(error.message);

    if (opciones.adminId) {
      await supabaseAdmin.from("logs_auditoria").insert({
        usuario_id_admin: opciones.adminId,
        accion: "publicar_programacion",
        entidad_afectada: torneoId,
        detalles: { publicada_en: publicadaEn },
      });
    }

    return { ok: true, publicada_en: publicadaEn };
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
}
