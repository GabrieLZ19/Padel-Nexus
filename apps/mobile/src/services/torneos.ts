import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type {
  ElegibilidadInscripcion,
  GrupoZonaTorneo,
  PartidoTorneo,
} from "@/src/types/competencia.types";
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
  async getAll(options?: { limit?: number }): Promise<Torneo[]> {
    try {
      const response = await api.get<Torneo[] | PaginatedTorneos>("/torneos", {
        params: {
          limit: options?.limit ?? 100,
        },
      });
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      return Array.isArray(payload.data) ? payload.data : [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar los torneos."));
    }
  },

  async getById(id: string): Promise<Torneo> {
    try {
      const response = await api.get<Torneo>(`/torneos/${id}`);
      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo cargar el torneo."));
    }
  },

  async getPartidos(torneoId: string): Promise<PartidoTorneo[]> {
    try {
      const response = await api.get<PartidoTorneo[]>(
        `/torneos/${torneoId}/partidos`,
      );
      return Array.isArray(response.data) ? response.data : [];
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron cargar los partidos."),
      );
    }
  },

  async getZonas(torneoId: string): Promise<GrupoZonaTorneo[]> {
    try {
      const response = await api.get<GrupoZonaTorneo[] | { data: GrupoZonaTorneo[] }>(
        `/torneos/${torneoId}/zonas`,
      );
      const payload = response.data;
      if (Array.isArray(payload)) return payload;
      return Array.isArray(payload.data) ? payload.data : [];
    } catch {
      return [];
    }
  },
};
