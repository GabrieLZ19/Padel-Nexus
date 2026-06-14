import { api } from "../api";
import { RankingJugador } from "../types";

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
    const response = await api.get<RankingJugador[]>("/rankings", { params });
    return response.data;
  },
};
