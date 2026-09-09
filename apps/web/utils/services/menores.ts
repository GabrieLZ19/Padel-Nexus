import { api } from "../api";

export interface ResponsableParentalPayload {
  nombre: string;
  apellido: string;
  dni: string;
  email: string;
  telefono: string;
  vinculo: string;
}

export interface ParentalLinkResult {
  token: string;
  consent_url: string;
  expires_at: string;
}

interface ApiResponse<T> {
  exito: boolean;
  data: T;
  error?: string;
}

export const MenoresService = {
  async registrarResponsable(
    datos: ResponsableParentalPayload,
  ): Promise<ParentalLinkResult> {
    const response = await api.post<ApiResponse<ParentalLinkResult>>(
      "/menores/responsable",
      datos,
    );
    return response.data.data;
  },

  async getConsentimientoPorToken(token: string) {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(
      `/menores/consentimiento/${token}`,
    );
    return response.data.data;
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
    const response = await api.post<ApiResponse<Record<string, unknown>>>(
      `/menores/consentimiento/${token}`,
      body,
    );
    return response.data.data;
  },

  async registrarAsentimiento(body: {
    entiende_datos: boolean;
    acepta_perfil_publico?: boolean | null;
  }) {
    const response = await api.post<ApiResponse<Record<string, unknown>>>(
      "/menores/asentimiento",
      body,
    );
    return response.data.data;
  },

  async getAutorizaciones(playerId?: string) {
    const path = playerId
      ? `/menores/autorizaciones/${playerId}`
      : "/menores/autorizaciones";
    const response = await api.get<ApiResponse<Record<string, unknown>>>(path);
    return response.data.data;
  },

  async revocar(tipo: string, playerId?: string) {
    const response = await api.patch<ApiResponse<Record<string, unknown>>>(
      "/menores/autorizaciones/revocar",
      { tipo, player_id: playerId },
    );
    return response.data.data;
  },

  async completarTransicionAdulto() {
    const response = await api.post<ApiResponse<Record<string, unknown>>>(
      "/menores/transicion-adulto",
    );
    return response.data.data;
  },
};
