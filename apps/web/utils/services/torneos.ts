import { api } from "../api";
import { Torneo, FormTorneoState, Partido, GrupoTorneoListado } from "../types";
import { hydrateTorneoRestrictions } from "../inscripcionElegibilidad";
import type { VistaTorneoId, VistaTorneoParam } from "../constants/padelConfig";

export interface PaginatedTorneos {
  data: Torneo[];
  total: number;
  vista?: VistaTorneoId | "todos";
  vista_automatica?: boolean;
  contadores?: Record<VistaTorneoId, number>;
  requieren_programacion?: number;
  total_torneos?: number;
  grupos?: GrupoTorneoListado[];
  aviso?: string | null;
}

export const TorneosService = {
  async getAll(options?: { limit?: number }): Promise<Torneo[]> {
    const params: Record<string, unknown> = {};
    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }

    const response = await api.get<Torneo[] | PaginatedTorneos>("/torneos", {
      params,
    });
    const payload = response.data as Torneo[] | PaginatedTorneos;
    if (Array.isArray(payload)) {
      return payload;
    }
    return Array.isArray(payload.data) ? payload.data : [];
  },
  async getByPage(
    page: number,
    limit: number,
    search?: string,
    estado?: string,
    options?: {
      incluirBorradores?: boolean;
      clubId?: string;
      vista?: VistaTorneoParam;
      agrupar?: boolean;
    },
  ): Promise<PaginatedTorneos> {
    const response = await api.get<PaginatedTorneos | Torneo[]>("/torneos", {
      params: {
        page,
        limit,
        search,
        estado,
        incluir_borradores: options?.incluirBorradores ? "true" : undefined,
        club_id: options?.clubId || undefined,
        vista: options?.vista,
        agrupar: options?.agrupar ? "true" : undefined,
      },
    });

    const payload = response.data as PaginatedTorneos | Torneo[];
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length };
    }

    return payload;
  },

  async getResumenTablero(): Promise<{
    total: number;
    activos: number;
    porAlcance: Record<string, number>;
    ultimos: Torneo[];
    provinciales_total?: number;
    provinciales_activos?: number;
    clasificatorios_total?: number;
    nacionales_total?: number;
    ultimos_provinciales?: Torneo[];
    ultimos_nacionales?: Torneo[];
    indice_torneo?: Array<{
      id?: string;
      nivel?: string | null;
      categoria?: string | null;
      alcance?: string | null;
    }>;
  }> {
    const response = await api.get("/torneos", { params: { resumen: "tablero" } });
    return response.data;
  },

  async getById(id: string): Promise<Torneo> {
    const response = await api.get<Torneo>(`/torneos/${id}`);
    return hydrateTorneoRestrictions(response.data);
  },

  async create(torneoData: FormTorneoState): Promise<Torneo> {
    const response = await api.post<Torneo>("/torneos", torneoData);
    return response.data;
  },

  async agrupar(
    nombre: string,
    torneoIds: string[],
  ): Promise<{ id: string | null; nombre: string | null }> {
    const response = await api.post<{ id: string | null; nombre: string | null }>(
      "/torneos/grupos",
      { nombre, torneo_ids: torneoIds },
    );
    return response.data;
  },

  async replicar(
    id: string,
    payload: { niveles: string[]; ramas?: string[] },
  ): Promise<{
    exito?: boolean;
    creados: Torneo[];
    omitidos: Array<{ rama: string; nivel: string; motivo: string }>;
  }> {
    const response = await api.post<{
      exito?: boolean;
      creados: Torneo[];
      omitidos: Array<{ rama: string; nivel: string; motivo: string }>;
    }>(`/torneos/${id}/replicar`, payload);
    return response.data;
  },

  async update(id: string, torneoData: Partial<FormTorneoState>): Promise<Torneo> {
    const response = await api.put<Torneo>(`/torneos/${id}`, torneoData);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/torneos/${id}`);
  },

  async subirBanner(id: string, imagenB64: string): Promise<{ banners: string[] }> {
    const response = await api.put<{ banners: string[] }>(`/torneos/${id}/banner`, { imagenB64 });
    return response.data;
  },

  async eliminarBanner(id: string, bannerUrl: string): Promise<{ banners: string[] }> {
    const response = await api.delete<{ banners: string[] }>(`/torneos/${id}/banner`, { data: { bannerUrl } });
    return response.data;
  },

  async getPartidos(
    torneoId: string,
    options?: { sincronizar?: boolean },
  ): Promise<Partido[]> {
    const params: Record<string, string> = {};
    if (options?.sincronizar === true) params.sincronizar = "1";
    if (options?.sincronizar === false) params.sincronizar = "0";
    const response = await api.get<Partido[]>(`/torneos/${torneoId}/partidos`, {
      params: Object.keys(params).length ? params : undefined,
    });
    return response.data;
  },

  async getInscripcionesConfirmadas(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/inscripciones`);
    return response.data;
  },

  async generarCuadro(torneoId: string, ordenSiembra?: string[], motivo?: string, forzarDestructivo?: boolean) {
    const response = await api.post(`/torneos/${torneoId}/generar-cuadro`, { ordenSiembra, motivo, forzarDestructivo });
    return response.data;
  },

  async actualizarResultado(
    partidoId: string,
    payload: {
      ganador_id: string;
      set1_a: number;
      set1_b: number;
      set2_a?: number | null;
      set2_b?: number | null;
      set3_a?: number | null;
      set3_b?: number | null;
      es_supertiebreak?: boolean;
      es_wo?: boolean;
      es_injustificado_wo?: boolean;
      es_lesion?: boolean;
      motivo?: string;
    },
  ) {
    const response = await api.put(
      `/torneos/partidos/${partidoId}/resultado`,
      payload,
    );
    return response.data;
  },

  async getZonas(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/zonas`);
    return response.data;
  },

  async getLlaveMatriz(torneoId: string): Promise<{
    pairCount: number;
    matches: Array<{ matchNo: number; a: string; b: string; winnerTo: number | null }>;
    supported: boolean;
  }> {
    const response = await api.get<{
      pairCount: number;
      matches: Array<{ matchNo: number; a: string; b: string; winnerTo: number | null }>;
      supported: boolean;
    }>(`/torneos/${torneoId}/llave-matriz`);
    return response.data;
  },

  async getSedes(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/sedes`);
    return response.data;
  },

  async guardarSedes(torneoId: string, clubIds: Array<string | number>) {
    const response = await api.post(`/torneos/${torneoId}/sedes`, {
      club_ids: clubIds,
    });
    return response.data;
  },

  async getCanchasDisponibilidad(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/canchas-disponibilidad`);
    return response.data;
  },

  async guardarCanchasDisponibilidad(
    torneoId: string,
    disponibilidad: unknown[],
  ) {
    const response = await api.post(`/torneos/${torneoId}/canchas-disponibilidad`, {
      disponibilidad,
    });
    return response.data;
  },

  async generarZonas(torneoId: string, _size?: number, forzarDestructivo?: boolean) {
    // Tamaño de zona siempre auto FAP (preferredSize=3 en backend)
    const response = await api.post(
      `/torneos/${torneoId}/generar-zonas`,
      { forzarDestructivo: forzarDestructivo === true },
    );
    return response.data;
  },

  async moverPareja(payload: {
    inscripcion_id: string;
    grupo_origen_id: string;
    grupo_destino_id: string;
    motivo: string;
  }) {
    const response = await api.put(`/torneos/override/mover-pareja`, payload);
    return response.data;
  },

  async guardarZonas(
    torneoId: string,
    payload: {
      zonas: {
        id: string;
        nombre: string;
        parejas: { id: string; es_cabeza_serie?: boolean }[];
      }[];
      motivo: string;
      validarCabezasSerie?: boolean;
      resoluciones_cabezas_serie?: {
        grupo_id: string;
        cabeza_inscripcion_id: string;
      }[];
    }
  ) {
    const response = await api.put(`/torneos/${torneoId}/guardar-zonas`, payload);
    return response.data;
  },

  async getAuditoria(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/auditoria`);
    return response.data;
  },

  async getPosicionesZona(
    torneoId: string,
    nombreZona: string,
    capacidad?: number,
  ) {
    const response = await api.get(
      `/torneos/${torneoId}/zonas/${encodeURIComponent(nombreZona)}/posiciones`,
      { params: { capacidad } },
    );
    return response.data;
  },

  async resolverSorteoZona(
    torneoId: string,
    nombreZona: string,
    payload: {
      resoluciones: Array<{ inscripcionId: string; posicion: number }>;
      motivo?: string;
      metodo: "digital" | "manual";
    },
  ) {
    const response = await api.post(
      `/torneos/${torneoId}/zonas/${encodeURIComponent(nombreZona)}/sorteo`,
      payload,
    );
    return response.data;
  },

  async notificarSorteoZona(
    torneoId: string,
    nombreZona: string,
    payload: {
      fechaHora: string;
      mensaje?: string;
      inscripcionIds?: string[];
    },
  ) {
    const response = await api.post(
      `/torneos/${torneoId}/zonas/${encodeURIComponent(nombreZona)}/sorteo/notificar`,
      payload,
    );
    return response.data;
  },

  async actualizarEquiposPartido(
    partidoId: string,
    payload: { equipo_a_id: string | null; equipo_b_id: string | null; motivo: string },
  ) {
    const response = await api.put(`/torneos/partidos/${partidoId}/equipos`, payload);
    return response.data;
  },

  async opcionesPromocionMenores(torneoId: string): Promise<{
    habilitado: boolean;
    motivo: string | null;
    parejas: {
      inscripcionId: string;
      nombre: string;
      partidoId: string;
      lado: "a" | "b";
      ronda: string;
    }[];
    destinos: {
      id: string;
      nombre: string;
      categoria: string | null;
      byes: {
        partidoId: string;
        lado: "a" | "b";
        rival: string;
        ronda: string | null;
      }[];
    }[];
  }> {
    const response = await api.get(`/torneos/${torneoId}/promocion-menores`);
    return response.data;
  },

  async promoverParejaMenores(
    torneoId: string,
    payload: {
      inscripcion_id: string;
      torneo_destino_id: string;
      partido_destino_id: string | null;
      lado: "a" | "b" | null;
      motivo: string;
    },
  ) {
    const response = await api.put(
      `/torneos/${torneoId}/promover-pareja`,
      payload,
    );
    return response.data as { mensaje?: string };
  },

  async gestionarParejaLlave(
    torneoId: string,
    payload: {
      accion: "agregar" | "quitar";
      inscripcion_id: string;
      motivo: string;
    },
  ) {
    const response = await api.put(`/torneos/${torneoId}/llave/pareja`, payload);
    return response.data;
  },

  async buscarParejasLlaveExternas(torneoId: string, q: string) {
    const response = await api.get<{
      resultados: Array<{
        inscripcion_origen_id: string;
        torneo_origen_nombre: string;
        categoria_origen: string | null;
        etiqueta: string;
        jugador1_nombre: string;
        jugador2_nombre: string | null;
      }>;
    }>(`/torneos/${torneoId}/llave/buscar-parejas`, {
      params: { q },
    });
    return response.data.resultados;
  },

  async altaParejaLlave(
    torneoId: string,
    payload:
      | {
          modo: "externa";
          inscripcion_origen_id: string;
          motivo: string;
          letra_prioridad?: string;
        }
      | {
          modo: "manual";
          jugador1_identificador: string;
          jugador2_identificador?: string;
          jugador1_datos?: {
            nombre?: string;
            apellido?: string;
            categoria_padel?: string;
            fecha_nacimiento?: string;
            telefono?: string;
          };
          jugador2_datos?: {
            nombre?: string;
            apellido?: string;
            categoria_padel?: string;
            fecha_nacimiento?: string;
            telefono?: string;
          };
          motivo: string;
          letra_prioridad?: string;
        },
  ) {
    const response = await api.post<{
      inscripcion: {
        id: string;
        jugador1_nombre: string;
        jugador2_nombre: string;
      };
    }>(`/torneos/${torneoId}/llave/alta-pareja`, payload);
    return response.data.inscripcion;
  },

  async actualizarPartido(
    partidoId: string,
    payload: Record<string, any>,
  ) {
    const response = await api.put(`/torneos/partidos/${partidoId}`, payload);
    return response.data;
  },

  async guardarSiembra(
    torneoId: string,
    payload: {
      matches: { id: string; equipo_a_id: string | null; equipo_b_id: string | null }[];
      motivo: string;
    }
  ) {
    const response = await api.post(`/torneos/${torneoId}/guardar-siembra`, payload);
    return response.data;
  },

  /**
   * Programacion de horarios (borrador -> programado -> publicado)
   */
  async previewProgramacion(torneoId: string): Promise<ProgramacionPreview> {
    const response = await api.get<ProgramacionPreview>(
      `/torneos/${torneoId}/programacion/preview`,
    );
    return response.data;
  },

  async reprogramarProgramacion(
    torneoId: string,
    payload: { motivo?: string } = {},
  ): Promise<ProgramacionPreview> {
    const response = await api.post<ProgramacionPreview>(
      `/torneos/${torneoId}/programacion/reprogramar`,
      payload,
    );
    return response.data;
  },

  async publicarProgramacion(
    torneoId: string,
  ): Promise<{ ok: true; publicada_en: string }> {
    const response = await api.post<{ ok: true; publicada_en: string }>(
      `/torneos/${torneoId}/programacion/publicar`,
      {},
    );
    return response.data;
  },

  async getProgramacionBoard(
    torneoId: string,
    params?: {
      duracion?: number;
      descanso?: number;
      descansoModo?: "tras_fin_60" | "tras_fin_120" | "entre_inicios_240";
      jornadas?: number;
      horaInicio?: string;
      horaFin?: string;
      franjasPorDia?: string | Record<string, { inicio?: string; fin?: string }>;
    },
  ): Promise<ProgramacionBoard> {
    const response = await api.get<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/board`,
      { params },
    );
    return response.data;
  },

  async asignarProgramacion(
    torneoId: string,
    payload: {
      partido_id: string;
      fecha_iso: string;
      cancha_label: string;
      motivo?: string;
    },
  ): Promise<ProgramacionBoard> {
    const response = await api.put<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/asignar`,
      payload,
    );
    return response.data;
  },

  async asignarLoteProgramacion(
    torneoId: string,
    payload: {
      asignaciones?: Array<{
        partido_id: string;
        cancha_label: string;
        fecha_iso: string;
      }>;
      partido_ids?: string[];
      dia?: string;
      motivo?: string;
    },
  ): Promise<ProgramacionBoard> {
    const response = await api.put<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/asignar-lote`,
      payload,
    );
    return response.data;
  },

  async desasignarProgramacion(
    torneoId: string,
    payload: { partido_id: string; motivo?: string },
  ): Promise<ProgramacionBoard> {
    const response = await api.put<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/desasignar`,
      payload,
    );
    return response.data;
  },

  async limpiarProgramacion(
    torneoId: string,
    payload: { motivo?: string } = {},
  ): Promise<ProgramacionBoard> {
    const response = await api.post<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/limpiar`,
      payload,
    );
    return response.data;
  },

  async autoAsignarProgramacion(
    torneoId: string,
    payload: {
      estrategia?: "smart" | "continuous";
      distribucion?: "zonas_primero" | "continua";
      duracionMinutos?: number;
      descansoMinutos?: number;
      descansoModo?: "tras_fin_60" | "tras_fin_120" | "entre_inicios_240";
      jornadas?: number;
      horaInicio?: string;
      horaFin?: string;
      franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
      motivo?: string;
    } = {},
  ): Promise<ProgramacionBoard> {
    const response = await api.post<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/auto`,
      payload,
    );
    return response.data;
  },

  async persistirConfigProgramacion(
    torneoId: string,
    payload: {
      duracionMinutos?: number;
      descansoModo?: "tras_fin_60" | "tras_fin_120" | "entre_inicios_240";
      franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
    } = {},
  ): Promise<ProgramacionBoard> {
    const response = await api.post<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/config`,
      payload,
    );
    return response.data;
  },

  async guardarBorradorProgramacion(
    torneoId: string,
    payload: {
      motivo?: string;
      duracionMinutos?: number;
      descansoMinutos?: number;
      descansoModo?: "tras_fin_60" | "tras_fin_120" | "entre_inicios_240";
      jornadas?: number;
      horaInicio?: string;
      horaFin?: string;
      franjasPorDia?: Record<string, { inicio?: string; fin?: string }>;
    } = {},
  ): Promise<ProgramacionBoard> {
    const response = await api.post<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/borrador`,
      payload,
    );
    return response.data;
  },

  async nuevaEdicionProgramacion(
    torneoId: string,
    payload: { motivo?: string } = {},
  ): Promise<ProgramacionBoard> {
    const response = await api.post<ProgramacionBoard>(
      `/torneos/${torneoId}/programacion/nueva-edicion`,
      payload,
    );
    return response.data;
  },
};

/**
 * Tipos publicos del endpoint de programacion. Se exportan para que las
 * pantallas del CRM tipar sin duplicar contrato.
 */
export type ProgramacionEstado = "borrador" | "programado" | "publicado";

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
  sin_horario: string[];
}

export type IssueSeverity = "ok" | "wait" | "bad";

export interface ProgramacionIssue {
  partido_id: string;
  severity: IssueSeverity;
  message: string;
}

export interface BoardPartido {
  id: string;
  ronda: string | null;
  ronda_etiqueta?: string;
  ronda_orden?: number;
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
  solo_lectura?: boolean;
  aviso_alcance?: string | null;
  programacion_publicada_en: string | null;
  duracion_partido_minutos: number;
  descanso_minutos: number;
  descanso_modo?: "tras_fin_60" | "tras_fin_120" | "entre_inicios_240";
  sugerencia?: { canchas: number; horas: number; mensaje: string };
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
  asignacion_lote?: {
    solicitados: number;
    asignados: number;
    sin_slot_ids: string[];
  };
}
