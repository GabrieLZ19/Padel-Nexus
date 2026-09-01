import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { Torneo } from "@/src/types/torneo.types";

interface PaginatedTorneos {
  data: Torneo[];
  total: number;
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

export const TorneosService = {
  async getAll(options?: { limit?: number; estado?: string }): Promise<Torneo[]> {
    try {
      const response = await api.get<Torneo[] | PaginatedTorneos>("/torneos", {
        params: {
          limit: options?.limit ?? 50,
          estado: options?.estado,
        },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      return Array.isArray(payload.data) ? payload.data : [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar los torneos."));
    }
  },
};
