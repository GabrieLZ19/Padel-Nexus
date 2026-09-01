import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { ReservaUsuario } from "@/src/types/reserva.types";

interface MisReservasResponse {
  exito: boolean;
  data: ReservaUsuario[];
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

export const ReservasService = {
  async getMisReservas(): Promise<ReservaUsuario[]> {
    try {
      const response = await api.get<MisReservasResponse>("/reservas/mis-reservas");
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar tus reservas."));
    }
  },
};
