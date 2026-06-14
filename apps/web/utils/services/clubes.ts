import { api } from "../api";
import { Club, FormClubState } from "../types";

export const ClubesService = {
  async getAll(): Promise<Club[]> {
    const response = await api.get<Club[]>("/clubes");
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
