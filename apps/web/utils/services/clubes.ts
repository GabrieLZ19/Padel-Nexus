import { api } from "../api";
import { Club, FormClubState } from "../types";
export interface ApiResponse {
  data: any[];
  total: number;
}

export const ClubesService = {
  async getAll(options?: any): Promise<ApiResponse> {
    const response = await api.get<ApiResponse>("/clubes", { params: options });
    return response.data;
  },

  async create(clubData: FormClubState): Promise<Club> {
    const response = await api.post<Club>("/clubes", clubData);
    return response.data;
  },

  async update(id: string | number, clubData: FormClubState): Promise<Club> {
    const response = await api.put<Club>(`/clubes/${id}`, clubData);
    return response.data;
  },

  async delete(id: string | number): Promise<void> {
    await api.delete(`/clubes/${id}`);
  },

  async getCanchas(clubId: string | number): Promise<any[]> {
    const response = await api.get<any>(`/clubes/${clubId}/canchas`);
    return response.data?.data || [];
  },

  async getById(id: string | number): Promise<Club> {
    const response = await api.get<any>(`/clubes/${id}`);
    return response.data?.data || response.data;
  },

  async createCancha(clubId: string | number, canchaData: any): Promise<any> {
    const response = await api.post<any>(`/clubes/${clubId}/canchas`, canchaData);
    return response.data?.data || response.data;
  },

  async updateCancha(canchaId: string | number, canchaData: any): Promise<any> {
    const response = await api.put<any>(`/clubes/canchas/${canchaId}`, canchaData);
    return response.data?.data || response.data;
  },

  async deleteCancha(canchaId: string | number): Promise<void> {
    await api.delete(`/clubes/canchas/${canchaId}`);
  },

  async createTurno(canchaId: string | number, turnoData: any): Promise<any> {
    const response = await api.post<any>(`/clubes/canchas/${canchaId}/turnos`, turnoData);
    return response.data?.data || response.data;
  },

  async deleteTurno(turnoId: string | number): Promise<void> {
    await api.delete(`/clubes/turnos/${turnoId}`);
  },
};
