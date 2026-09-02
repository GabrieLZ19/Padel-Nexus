import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { RankingJugador, RankingPerfilJugador } from "@/src/types/competencia.types";

interface ApiResponse<T> {
  exito?: boolean;
  data: T;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export const RankingsService = {
  async getGlobal(params?: {
    categoria?: string;
    rama?: string;
    provincia?: string;
    scope?: string;
  }): Promise<RankingJugador[]> {
    try {
      const response = await api.get<ApiResponse<RankingJugador[]>>("/rankings", {
        params,
      });
      return response.data.data || [];
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo cargar el ranking."),
      );
    }
  },

  async getByUserId(usuarioId: string): Promise<RankingPerfilJugador[]> {
    try {
      const response = await api.get<ApiResponse<RankingPerfilJugador[]>>(
        `/rankings/${usuarioId}`,
      );
      return response.data.data || [];
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 404 || status === 500) {
          return [];
        }
      }
      throw new Error(
        getErrorMessage(error, "No se pudo cargar el perfil del jugador."),
      );
    }
  },
};
