import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { Club } from "@/src/types/club.types";

interface ClubesResponse {
  data: Club[];
  total: number;
  exito?: boolean;
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

export const ClubesService = {
  async getAll(options?: {
    limit?: number;
    search?: string;
    provincia?: string;
  }): Promise<Club[]> {
    try {
      const response = await api.get<ClubesResponse | Club[]>("/clubes", {
        params: {
          page: 1,
          limit: options?.limit ?? 30,
          search: options?.search,
          provincia: options?.provincia,
        },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      return Array.isArray(payload.data) ? payload.data : [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar los clubes."));
    }
  },
};
