import { api } from "../api";
import { Club, FormClubState } from "../types";
export interface ApiResponse {
  data: Club[];
  total: number;
}

export const ClubesService = {
  async getAll(): Promise<ApiResponse> {
    const response = await api.get<ApiResponse>("/clubes");
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
};
