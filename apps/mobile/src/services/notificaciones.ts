import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { Notificacion } from "@/src/types/notificacion.types";

interface ApiListResponse {
  exito: boolean;
  data: Notificacion[];
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

export const NotificacionesService = {
  async listar(): Promise<Notificacion[]> {
    try {
      const response = await api.get<ApiListResponse>("/notificaciones");
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron cargar las notificaciones."),
      );
    }
  },

  async marcarLeida(id: string): Promise<void> {
    try {
      await api.patch(`/notificaciones/${id}/leida`);
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo marcar la notificación."),
      );
    }
  },

  async marcarTodasLeidas(): Promise<void> {
    try {
      await api.post("/notificaciones/leidas-todas");
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudieron marcar las notificaciones."),
      );
    }
  },
};
