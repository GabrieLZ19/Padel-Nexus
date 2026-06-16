import { api } from "../api";
import { Perfil } from "../types";

export const PerfilService = {
  async getMe(): Promise<Perfil> {
    const response = await api.get<Perfil>("/perfil/me");
    return response.data;
  },

  async updateMe(perfilData: Perfil): Promise<Perfil> {
    const response = await api.put<Perfil>("/perfil/me", perfilData);
    return response.data;
  },
};
