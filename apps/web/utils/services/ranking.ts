import { api } from "../api";
import { RankingJugador } from "../types";
import { ApiResponse } from "./perfil";

export const RankingsService = {
  /**
   * Obtiene el ranking de jugadores aplicando filtros opcionales
   */
  async getGlobal(params?: {
    categoria?: string;
    rama?: string;
    provincia?: string;
    scope?: string;
  }): Promise<RankingJugador[]> {
    const response = await api.get<ApiResponse<RankingJugador[]>>("/rankings", { params });
    return response.data.data || [];
  },
};
