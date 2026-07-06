import { api } from "../api";
import { Torneo, FormTorneoState, Partido } from "../types";

export interface PaginatedTorneos {
  data: Torneo[];
  total: number;
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
  ): Promise<PaginatedTorneos> {
    const response = await api.get<PaginatedTorneos | Torneo[]>("/torneos", {
      params: { page, limit, search, estado },
    });

    const payload = response.data as PaginatedTorneos | Torneo[];
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length };
    }

    return payload;
  },

  async getById(id: string): Promise<Torneo> {
    const response = await api.get<Torneo>(`/torneos/${id}`);
    return response.data;
  },

  async create(torneoData: FormTorneoState): Promise<Torneo> {
    const response = await api.post<Torneo>("/torneos", torneoData);
    return response.data;
  },

  async update(id: string, torneoData: FormTorneoState): Promise<Torneo> {
    const response = await api.put<Torneo>(`/torneos/${id}`, torneoData);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/torneos/${id}`);
  },

  async getPartidos(torneoId: string): Promise<Partido[]> {
    const response = await api.get<Partido[]>(`/torneos/${torneoId}/partidos`);
    return response.data;
  },

  async getInscripcionesConfirmadas(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/inscripciones`);
    return response.data;
  },

  async generarCuadro(torneoId: string, ordenSiembra?: string[], motivo?: string) {
    const response = await api.post(`/torneos/${torneoId}/generar-cuadro`, { ordenSiembra, motivo });
    return response.data;
  },

  async actualizarResultado(
    partidoId: string,
    payload: { ganador_id: string; set1_a: number; set1_b: number },
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

  async generarZonas(torneoId: string, size?: number) {
    const response = await api.post(
      `/torneos/${torneoId}/generar-zonas`,
      {},
      { params: size ? { tamanioGrupo: size } : {} }
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
      zonas: { id: string; nombre: string; parejas: { id: string }[] }[];
      motivo: string;
    }
  ) {
    const response = await api.put(`/torneos/${torneoId}/guardar-zonas`, payload);
    return response.data;
  },

  async getAuditoria(torneoId: string) {
    const response = await api.get(`/torneos/${torneoId}/auditoria`);
    return response.data;
  },

  async actualizarEquiposPartido(
    partidoId: string,
    payload: { equipo_a_id: string | null; equipo_b_id: string | null; motivo: string },
  ) {
    const response = await api.put(`/torneos/partidos/${partidoId}/equipos`, payload);
    return response.data;
  },
};
