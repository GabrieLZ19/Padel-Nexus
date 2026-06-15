import { api } from "../api";
import { Partido } from "../types";

export const PartidosService = {
  async getAbiertos(params?: {
    categoria?: string;
    club_id?: string;
  }): Promise<Partido[]> {
    const response = await api.get<Partido[]>("/partidos/abiertos", { params });
    return response.data;
  },

  async publicar(data: {
    club_id: string;
    categoria: string;
    franja_horaria: string;
    cupos_totales: number;
  }): Promise<Partido> {
    const response = await api.post<Partido>("/partidos/publicar", data);
    return response.data;
  },

  async unirse(partidoId: string | number): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `/partidos/${partidoId}/unirse`,
    );
    return response.data;
  },
};
