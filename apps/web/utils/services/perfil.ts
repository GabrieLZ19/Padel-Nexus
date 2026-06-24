import { api } from "../api";
import { Perfil } from "../types";
import { isAxiosError } from "axios"; // IMPORTACIÓN REQUERIDA

export const PerfilService = {
  async getMe(): Promise<Perfil | null> {
    try {
      const response = await api.get<Perfil>("/perfil/me");
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  },

  async updateMe(perfilData: Perfil): Promise<Perfil> {
    const response = await api.put<Perfil>("/perfil/me", perfilData);
    return response.data;
  },

  async getById(id: string): Promise<Perfil> {
    const response = await api.get<Perfil>(`/perfil/${id}`);
    return response.data;
  },
};
