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

function normalizeClub(raw: Club): Club {
  return {
    ...raw,
    latitud:
      raw.latitud == null || raw.latitud === undefined
        ? null
        : Number(raw.latitud),
    longitud:
      raw.longitud == null || raw.longitud === undefined
        ? null
        : Number(raw.longitud),
    distancia_km:
      raw.distancia_km == null || raw.distancia_km === undefined
        ? null
        : Number(raw.distancia_km),
  };
}

export const ClubesService = {
  async getAll(options?: {
    limit?: number;
    search?: string;
    provincia?: string;
    lat?: number;
    lng?: number;
    ordenar?: "distancia";
  }): Promise<Club[]> {
    try {
      const response = await api.get<ClubesResponse | Club[]>("/clubes", {
        params: {
          page: 1,
          limit: options?.limit ?? 30,
          search: options?.search,
          provincia: options?.provincia,
          lat: options?.lat,
          lng: options?.lng,
          ordenar: options?.ordenar,
        },
      });
      const payload = response.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : [];
      return list.map(normalizeClub);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar los clubes."));
    }
  },

  async getById(clubId: string): Promise<Club | null> {
    try {
      const response = await api.get<{ exito: boolean; data: Club }>(
        `/clubes/${clubId}`,
      );
      return response.data.data ? normalizeClub(response.data.data) : null;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(getErrorMessage(error, "No se pudo cargar el club."));
    }
  },
};
