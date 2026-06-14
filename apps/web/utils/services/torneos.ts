import { api } from "../api";
import { Torneo, FormTorneoState } from "../types";

export const TorneosService = {
  async getAll(): Promise<Torneo[]> {
    const response = await api.get<Torneo[]>("/torneos");
    return response.data;
  },
  async create(torneoData: FormTorneoState): Promise<Torneo> {
    const response = await api.post<Torneo>("/torneos", torneoData);
    return response.data;
  },

  async update(
    id: string | number,
    torneoData: FormTorneoState,
  ): Promise<Torneo> {
    const response = await api.put<Torneo>(`/torneos/${id}`, torneoData);
    return response.data;
  },
  async delete(id: string | number): Promise<void> {
    await api.delete(`/torneos/${id}`);
  },
};
