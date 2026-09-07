import { api } from "../api";
import {
  Club,
  FormClubState,
  BloqueoDisponibilidad,
  CrearBloqueoPayload,
} from "../types";
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
    const response = await api.post<{ exito?: boolean; data?: Club } & Club>(
      "/clubes",
      clubData,
    );
    return (response.data?.data || response.data) as Club;
  },

  async update(id: string | number, clubData: FormClubState): Promise<Club> {
    const response = await api.put<{ exito?: boolean; data?: Club } & Club>(
      `/clubes/${id}`,
      clubData,
    );
    return (response.data?.data || response.data) as Club;
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

  async getBloqueos(
    clubId: string | number,
    params?: { desde?: string; hasta?: string; todos?: boolean },
  ): Promise<BloqueoDisponibilidad[]> {
    const response = await api.get<{ data?: BloqueoDisponibilidad[] }>(
      `/clubes/${clubId}/bloqueos`,
      {
        params: {
          desde: params?.desde,
          hasta: params?.hasta,
          todos: params?.todos ? "1" : undefined,
        },
      },
    );
    return response.data?.data || [];
  },

  async crearBloqueo(
    clubId: string | number,
    payload: CrearBloqueoPayload,
  ): Promise<BloqueoDisponibilidad> {
    const response = await api.post<{
      exito?: boolean;
      data?: BloqueoDisponibilidad;
    }>(`/clubes/${clubId}/bloqueos`, payload);
    return (response.data?.data || response.data) as BloqueoDisponibilidad;
  },

  async eliminarBloqueo(
    clubId: string | number,
    bloqueoId: string,
    hard = false,
  ): Promise<void> {
    await api.delete(`/clubes/${clubId}/bloqueos/${bloqueoId}`, {
      params: hard ? { hard: "1" } : undefined,
    });
  },
};
