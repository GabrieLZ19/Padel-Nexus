import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type {
  PreferenciaMercadoPago,
} from "@/src/services/pagos";
import type {
  ReservaUsuario,
  SlotDisponible,
  TurnoReservaEmbed,
} from "@/src/types/reserva.types";

interface ApiResponse<T> {
  exito: boolean;
  data: T;
  error?: string;
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
      const response = await api.get<ApiResponse<ReservaUsuario[]>>(
        "/reservas/mis-reservas",
      );
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudieron cargar tus reservas."));
    }
  },

  async getDisponibles(
    clubId: string,
    fecha: string,
  ): Promise<SlotDisponible[]> {
    try {
      const response = await api.get<ApiResponse<SlotDisponible[]>>(
        "/reservas/disponibles",
        { params: { club_id: clubId, fecha } },
      );
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo cargar la disponibilidad."),
      );
    }
  },

  async getTurno(turnoId: string): Promise<TurnoReservaEmbed> {
    try {
      const response = await api.get<ApiResponse<TurnoReservaEmbed>>(
        `/reservas/turno/${turnoId}`,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se encontró el turno."));
    }
  },

  async crear(payload: {
    turno_id: string;
    fecha_reserva: string;
  }): Promise<ReservaUsuario> {
    try {
      const response = await api.post<ApiResponse<ReservaUsuario>>(
        "/reservas",
        payload,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo crear la reserva."));
    }
  },

  async getById(reservaId: string): Promise<ReservaUsuario> {
    try {
      const response = await api.get<ApiResponse<ReservaUsuario>>(
        `/reservas/${reservaId}`,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se encontró la reserva."));
    }
  },

  async cancelar(reservaId: string): Promise<void> {
    try {
      await api.post(`/reservas/${reservaId}/cancelar`);
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo cancelar la reserva."));
    }
  },

  async crearPreferenciaMp(reservaId: string): Promise<PreferenciaMercadoPago> {
    try {
      const response = await api.post<ApiResponse<PreferenciaMercadoPago>>(
        `/reservas/${reservaId}/preferencia-mp`,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo iniciar el pago con Mercado Pago."),
      );
    }
  },

  async confirmarRetornoMp(
    reservaId: string,
    paymentId: string,
  ): Promise<unknown> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        `/reservas/${reservaId}/confirmar-retorno`,
        { payment_id: paymentId },
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo confirmar el pago de la reserva."),
      );
    }
  },

  async pagarManual(
    reservaId: string,
    payload: {
      monto: number;
      metodo_pago: string;
      referencia_pago?: string;
    },
  ): Promise<unknown> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        `/reservas/${reservaId}/pagar`,
        payload,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo registrar el pago."));
    }
  },
};
