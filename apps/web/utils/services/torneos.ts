import { api } from "../api";
import { Torneo, FormTorneoState, Partido } from "../types";

export const TorneosService = {
  async getAll(): Promise<Torneo[]> {
    const response = await api.get<Torneo[]>("/torneos");
    return response.data;
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

  async generarCuadro(torneoId: string) {
    const response = await api.post(`/torneos/${torneoId}/generar-cuadro`);
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
};
