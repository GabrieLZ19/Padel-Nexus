import { supabaseAdmin } from "../config/supabase";
import { ProgramacionService } from "./programacion.service";
import { TorneoService } from "./torneo.service";
import type { ModoDescanso } from "../utils/programadorReglas";
import { buildOcupadosDesdePartidos } from "../utils/programacionPartidos";
import {
  cargarMetaEvento,
  cargarPartidosProgramablesEvento,
  mergeBoardsEvento,
  normalizarFilasDisponibilidadEvento,
  resolverOrdenCategoriasEvento,
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
      await ProgramacionService.limpiar(t.id, { ...opciones, omitirBoard: true });
    }
    return ProgramacionEventoService.getBoard(grupoId);
  }

  /**
   * CLI-11: persiste el orden de prioridad de categorías del evento.
   */
  static async guardarOrdenCategoriasEvento(
    grupoId: string,
    ordenTorneoIds: string[],
  ): Promise<string[]> {
    const meta = await cargarMetaEvento(grupoId);
    const torneoIds = meta.torneos.map((t) => t.id);
    const orden = resolverOrdenCategoriasEvento(torneoIds, ordenTorneoIds);
    const { error } = await supabaseAdmin
      .from("grupos_torneo")
      .update({ programacion_orden_torneo_ids: orden })
      .eq("id", grupoId);
    if (error) throw new Error(error.message);
    return orden;
  }

  /**
   * Fase 2 / CLI-11: auto por categorías en orden, dos pasadas (zonas luego llave).
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
      franjasPorDia?: Record<string, { inicio?: string; fin?: string; duracion?: number }>;
      motivo?: string;
      adminId?: string;
    } = {},
  ): Promise<ProgramacionBoardEvento> {
    const meta = await cargarMetaEvento(grupoId);
    const torneoIds = meta.torneos.map((t) => t.id);
    let orden = resolverOrdenCategoriasEvento(
      torneoIds,
      meta.orden_categorias,
    );
    if (opciones.orden_torneo_ids?.length) {
      orden = resolverOrdenCategoriasEvento(
        torneoIds,
        opciones.orden_torneo_ids,
      );
      await ProgramacionEventoService.guardarOrdenCategoriasEvento(
        grupoId,
        orden,
      );
    }

    const baseOpciones = {
      ...opciones,
      motivo: opciones.motivo,
      adminId: opciones.adminId,
      distribucion: "zonas_primero" as const,
    };

    for (const soloFase of ["zonas", "llave"] as const) {
      const eventPartidos = await cargarPartidosProgramablesEvento(grupoId);
      const ocupadosSemilla = buildOcupadosDesdePartidos(
        eventPartidos.filter((p) => p.cancha_asignada && p.fecha_partido),
      );
      for (const torneoId of orden) {
        await ProgramacionService.autoAsignar(torneoId, {
          ...baseOpciones,
          soloFase,
          ocupadosSemilla,
          omitirBoard: true,
        });
        const refrescados = await cargarPartidosProgramablesEvento(grupoId);
        ocupadosSemilla.clear();
        for (const key of buildOcupadosDesdePartidos(
          refrescados.filter((p) => p.cancha_asignada && p.fecha_partido),
        )) {
          ocupadosSemilla.add(key);
        }
      }
    }

    return ProgramacionEventoService.getBoard(grupoId);
  }

  /** CLI-17: intercambio validado y atómico entre categorías del evento. */
  static async intercambiar(
    grupoId: string,
    payload: {
      partido_id: string;
      occupant_id: string;
      destino: { fecha_iso: string; cancha_label: string };
      origen?: { fecha_iso: string; cancha_label: string } | null;
      motivo?: string;
      adminId?: string;
    },
  ): Promise<ProgramacionBoardEvento> {
    const {
      validarIntercambioHorariosEvento,
      aplicarIntercambioHorariosPartidos,
    } = await import("../utils/programacionIntercambio");
    const err = await validarIntercambioHorariosEvento(grupoId, payload);
    if (err) throw new Error(err);
    await aplicarIntercambioHorariosPartidos(payload, payload.motivo);
    return ProgramacionEventoService.getBoard(grupoId);
  }

  static async persistirConfig(
    grupoId: string,
    opciones: {
      duracionMinutos?: number;
      descansoModo?: ModoDescanso;
      franjasPorDia?: Record<string, { inicio?: string; fin?: string; duracion?: number }>;
      adminId?: string;
    } = {},
  ): Promise<ProgramacionBoardEvento> {
    const meta = await cargarMetaEvento(grupoId);
    for (const t of meta.torneos) {
      if (t.programacion_estado === "publicado") continue;
      await ProgramacionService.persistirConfigProgramacion(t.id, opciones);
    }
    return ProgramacionEventoService.getBoard(grupoId, opciones);
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

  /**
   * CLI-9: sedes del evento replicadas en cada categoría (misma configuración).
   */
  static async guardarSedesEvento(
    grupoId: string,
    clubIds: Array<string | number>,
  ): Promise<void> {
    const meta = await cargarMetaEvento(grupoId);
    const ids = clubIds.map((id) => String(id));
    for (const t of meta.torneos) {
      await TorneoService.guardarSedes(t.id, ids);
    }
  }

  /**
   * CLI-9: franjas de canchas replicadas en cada categoría del evento.
   */
  static async guardarCanchasDisponibilidadEvento(
    grupoId: string,
    disponibilidad: Array<Record<string, unknown>>,
  ): Promise<void> {
    const meta = await cargarMetaEvento(grupoId);
    const filas = normalizarFilasDisponibilidadEvento(disponibilidad);
    for (const t of meta.torneos) {
      const conCategoria = filas.map((fila) => ({
        ...fila,
        categoria:
          fila.categoria ||
          (t.categoria ? String(t.categoria) : null),
      }));
      await TorneoService.guardarCanchasDisponibilidad(t.id, conCategoria);
    }
  }
}