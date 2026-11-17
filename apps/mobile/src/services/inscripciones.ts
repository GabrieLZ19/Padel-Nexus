import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { PreferenciaMercadoPago } from "@/src/services/pagos";
import type { ElegibilidadInscripcion } from "@/src/types/competencia.types";

type ApiResponse<T> = { exito?: boolean; data: T };

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

export const InscripcionesService = {
  async chequearElegibilidad(params: {
    torneo_id: string;
    usuario2_email?: string;
  }): Promise<ElegibilidadInscripcion> {
    try {
      const response = await api.get<ElegibilidadInscripcion>(
        "/inscripciones/elegibilidad",
        {
          params: {
            torneo_id: params.torneo_id,
            usuario2_email: params.usuario2_email || undefined,
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo validar la elegibilidad."),
      );
    }
  },

  async inscribir(data: {
    torneo_id: string;
    usuario_id: string;
    usuario2_email?: string | null;
    jugador1_nombre: string;
    jugador2_nombre: string;
    monto: number;
  }) {
    try {
      const response = await api.post<{ id: string }>("/inscripciones", data);
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo completar la inscripción."),
      );
    }
  },

  async crearPreferenciaMp(
    inscripcionId: string,
  ): Promise<PreferenciaMercadoPago> {
    try {
      const response = await api.post<ApiResponse<PreferenciaMercadoPago>>(
        `/inscripciones/${inscripcionId}/preferencia-mp`,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo iniciar el pago de la inscripción."),
      );
    }
  },

  async confirmarRetornoMp(
    inscripcionId: string,
    paymentId: string,
  ): Promise<unknown> {
    try {
      const response = await api.post<ApiResponse<unknown>>(
        `/inscripciones/${inscripcionId}/confirmar-retorno`,
        { payment_id: paymentId },
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo confirmar el pago de la inscripción."),
      );
    }
  },
};
