import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { PreferenciaMercadoPago } from "@/src/services/pagos";
import type { Licencia, LicenciaCotizacion } from "@/src/types/licencia.types";

interface ApiResponse<T> {
  exito: boolean;
  data: T;
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string; mensaje?: string }
      | undefined;
    return data?.error || data?.message || data?.mensaje || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export const LicenciasService = {
  async obtenerPorUsuario(usuarioId: string): Promise<Licencia | null> {
    try {
      const response = await api.get<ApiResponse<Licencia>>(
        `/licencias/${usuarioId}`,
      );
      return response.data.data;
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw new Error(getErrorMessage(error, "No se pudo cargar la licencia."));
    }
  },

  async cotizar(params?: {
    club_id?: string | null;
    provincia?: string | null;
  }): Promise<LicenciaCotizacion> {
    try {
      const response = await api.get<ApiResponse<LicenciaCotizacion>>(
        "/licencias/cotizacion",
        {
          params: {
            club_id: params?.club_id || undefined,
            provincia: params?.provincia || undefined,
          },
        },
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo obtener el precio de la licencia."),
      );
    }
  },

  async solicitar(datos: {
    nombre: string;
    apellido: string;
    documento: string;
    provincia: string;
    club_id: string;
  }): Promise<Licencia> {
    try {
      const response = await api.post<ApiResponse<Licencia>>(
        "/licencias/solicitar",
        datos,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo solicitar la licencia."),
      );
    }
  },

  async crearPreferenciaMp(
    licenciaId: string,
  ): Promise<PreferenciaMercadoPago & { licencia?: Licencia }> {
    try {
      const response = await api.post<
        ApiResponse<PreferenciaMercadoPago & { licencia?: Licencia }>
      >(`/licencias/${licenciaId}/preferencia-mp`);
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo iniciar el pago de la licencia."),
      );
    }
  },

  async confirmarRetornoMp(
    licenciaId: string,
    paymentId: string,
  ): Promise<Licencia> {
    try {
      const response = await api.post<ApiResponse<Licencia>>(
        `/licencias/${licenciaId}/confirmar-retorno`,
        { payment_id: paymentId },
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo confirmar el pago de la licencia."),
      );
    }
  },
};
