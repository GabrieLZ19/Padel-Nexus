import { api } from "../api";
import { Torneo, FormTorneoState, Partido } from "../types";
import { hydrateTorneoRestrictions } from "../inscripcionElegibilidad";

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
    return hydrateTorneoRestrictions(response.data);
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

  async subirBanner(id: string, imagenB64: string): Promise<{ banners: string[] }> {
    const response = await api.put<{ banners: string[] }>(`/torneos/${id}/banner`, { imagenB64 });
    return response.data;
  },

  async eliminarBanner(id: string, bannerUrl: string): Promise<{ banners: string[] }> {
    const response = await api.delete<{ banners: string[] }>(`/torneos/${id}/banner`, { data: { bannerUrl } });
    return response.data;
  },

  async getPartidos(torneoId: string): Promise<Partido[]> {
    const response = await api.get<Partido[]>(`/torneos/${torneoId}/partidos`);
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
      zonas: { id: string; nombre: string; parejas: { id: string }[] }[];
      motivo: string;
      validarCabezasSerie?: boolean;
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
};
