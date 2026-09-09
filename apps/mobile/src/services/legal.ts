import { isAxiosError } from "axios";

import { api } from "@/src/services/api";

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

export type LegalTipo =
  | "tyc"
  | "privacidad"
  | "privacidad_menores"
  | "consentimiento_parental";

export interface LegalDocumento {
  id: string;
  tipo: LegalTipo;
  version: string;
  titulo: string;
  contenido_md: string;
}

interface ApiResponse<T> {
  exito: boolean;
  data: T;
}

export const LegalService = {
  async getDocumento(tipo: LegalTipo): Promise<LegalDocumento> {
    try {
      const response = await api.get<ApiResponse<LegalDocumento>>(
        `/legal/${tipo}`,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "No se pudo cargar el documento."));
    }
  },
};

export const MenoresService = {
  async getConsentimientoPorToken(token: string) {
    try {
      const response = await api.get<ApiResponse<Record<string, unknown>>>(
        `/menores/consentimiento/${token}`,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Enlace inválido."));
    }
  },

  async confirmarConsentimiento(
    token: string,
    body: {
      declara_representacion: boolean;
      consentimiento_esencial: boolean;
      leyo_privacidad_menores: boolean;
      autoriza_perfil_publico?: boolean;
    },
  ) {
    try {
      const response = await api.post<ApiResponse<Record<string, unknown>>>(
        `/menores/consentimiento/${token}`,
        body,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo confirmar el consentimiento."),
      );
    }
  },

  async registrarAsentimiento(body: {
    entiende_datos: boolean;
    acepta_perfil_publico?: boolean | null;
  }) {
    try {
      const response = await api.post<ApiResponse<Record<string, unknown>>>(
        "/menores/asentimiento",
        body,
      );
      return response.data.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo registrar el asentimiento."),
      );
    }
  },
};
