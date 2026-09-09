import { api } from "../api";

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
  vigente_desde: string;
  activo: boolean;
}

interface ApiResponse<T> {
  exito: boolean;
  data: T;
  error?: string;
}

export const LegalService = {
  async getDocumento(tipo: LegalTipo): Promise<LegalDocumento> {
    const response = await api.get<ApiResponse<LegalDocumento>>(
      `/legal/${tipo}`,
    );
    return response.data.data;
  },

  async getVersiones(): Promise<
    Record<string, { version: string; titulo: string }>
  > {
    const response = await api.get<
      ApiResponse<Record<string, { version: string; titulo: string }>>
    >("/legal/versiones");
    return response.data.data;
  },
};
