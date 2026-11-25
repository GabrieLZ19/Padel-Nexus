import { supabaseAdmin } from "../config/supabase";
import { ProgramacionService } from "./programacion.service";
import type { ModoDescanso } from "../utils/programadorReglas";
import { buildOcupadosDesdePartidos } from "../utils/programacionPartidos";
import {
  cargarMetaEvento,
  cargarPartidosProgramablesEvento,
  mergeBoardsEvento,
  type ProgramacionBoardEvento,
} from "../utils/programacionEvento";

export class ProgramacionEventoService {
  static async getBoard(
    grupoId: string,
    opciones: Parameters<typeof ProgramacionService.getBoard>[1] = {},
  ): Promise<ProgramacionBoardEvento> {
    const meta = await cargarMetaEvento(grupoId);
    const boards = await Promise.all(
      meta.torneos.map((t) => ProgramacionService.getBoard(t.id, opciones)),
    );
    return await mergeBoardsEvento(grupoId, meta, boards);
  }

  static async asignar(
    grupoId: string,
    payload: {
      partido_id: string;
      fecha_iso: string;
      cancha_label: string;
      motivo?: string;
      adminId?: string;
    },
  ): Promise<ProgramacionBoardEvento> {
    const partidos = await cargarPartidosProgramablesEvento(grupoId);
    const fila = partidos.find((p) => String(p.id) === payload.partido_id);
    if (!fila) throw new Error("Partido no pertenece al evento");
    await ProgramacionService.asignar(fila.torneo_id, payload);
    return ProgramacionEventoService.getBoard(grupoId);
  }

  static async desasignar(
    grupoId: string,
    payload: { partido_id: string; motivo?: string; adminId?: string },
  ): Promise<ProgramacionBoardEvento> {
    const partidos = await cargarPartidosProgramablesEvento(grupoId);
    const fila = partidos.find((p) => String(p.id) === payload.partido_id);
    if (!fila) throw new Error("Partido no pertenece al evento");
    await ProgramacionService.desasignar(fila.torneo_id, payload);
    return ProgramacionEventoService.getBoard(grupoId);
  }

  static async limpiar(
    grupoId: string,
    opciones: { motivo?: string; adminId?: string; torneo_id?: string } = {},
  ): Promise<ProgramacionBoardEvento> {
    const meta = await cargarMetaEvento(grupoId);
    const targets = opciones.torneo_id
      ? meta.torneos.filter((t) => t.id === opciones.torneo_id)
      : meta.torneos;
    for (const t of targets) {
      await ProgramacionService.limpiar(t.id, opciones);
    }
    return ProgramacionEventoService.getBoard(grupoId);
  }

  /**
   * Fase 2: auto por categorías en orden (prioridad opcional), compartiendo ocupación.
   */
  static async autoAsignar(
    grupoId: string,
    opciones: {
      orden_torneo_ids?: string[];
      estrategia?: "smart" | "continuous";
      distribucion?: import("../utils/programadorReglas").DistribucionProgramacion;
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
  ): Promise<ProgramacionBoardEvento> {
    const meta = await cargarMetaEvento(grupoId);
    let orden = meta.torneos.map((t) => t.id);
    if (opciones.orden_torneo_ids?.length) {
      const prefs = opciones.orden_torneo_ids.filter((id) =>
        orden.includes(id),
      );
      orden = [...prefs, ...orden.filter((id) => !prefs.includes(id))];
    }

    for (const torneoId of orden) {
      const eventPartidos = await cargarPartidosProgramablesEvento(grupoId);
      const ocupadosSemilla = buildOcupadosDesdePartidos(
        eventPartidos.filter((p) => p.cancha_asignada && p.fecha_partido),
      );
      await ProgramacionService.autoAsignar(torneoId, {
        ...opciones,
        motivo: opciones.motivo,
        adminId: opciones.adminId,
        ocupadosSemilla,
      });
    }

    return ProgramacionEventoService.getBoard(grupoId);
  }

  static async publicar(
    grupoId: string,
    payload: {
      torneo_ids?: string[];
      adminId?: string;
    } = {},
  ): Promise<ProgramacionBoardEvento> {
    const meta = await cargarMetaEvento(grupoId);
    const ids = payload.torneo_ids?.length
      ? payload.torneo_ids.filter((id) =>
          meta.torneos.some((t) => t.id === id),
        )
      : meta.torneos.map((t) => t.id);
    for (const torneoId of ids) {
      await ProgramacionService.publicar(torneoId, {
        adminId: payload.adminId,
      });
    }
    return ProgramacionEventoService.getBoard(grupoId);
  }

  static async resolverGrupoDesdeTorneo(
    torneoId: string,
  ): Promise<{ grupo_id: string | null }> {
    const { data } = await supabaseAdmin
      .from("torneos")
      .select("grupo_id")
      .eq("id", torneoId)
      .maybeSingle();
    return { grupo_id: data?.grupo_id ? String(data.grupo_id) : null };
  }
}