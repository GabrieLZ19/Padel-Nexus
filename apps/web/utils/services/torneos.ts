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
};
