import { api } from "../api";
import { Licencia } from "../types";

interface DatosSolicitud {
  nombre: string;
  apellido: string;
  documento: string;
  club: string;
  provincia: string;
}

export interface PaginatedLicencias {
  data: Licencia[];
  total: number;
}

export const LicenciasService = {
  // Para el Admin
  async getAll(): Promise<Licencia[]> {
    const response = await api.get<Licencia[]>("/licencias");
    return response.data;
  },

  async getByPage(
    page: number,
    limit: number,
    search?: string,
  ): Promise<PaginatedLicencias> {
    const response = await api.get<PaginatedLicencias | Licencia[]>(
      "/licencias",
      {
        params: { page, limit, search },
      },
    );

    const payload = response.data as PaginatedLicencias | Licencia[];
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length };
    }

    return payload;
  },

  // Para el Usuario (Solicitud)
  async solicitarAlta(data: DatosSolicitud): Promise<Licencia> {
    const response = await api.post<Licencia>("/licencias/solicitar", data);
    return response.data;
  },

  // Para el Admin (Actualización de estado)
  async updateEstado(id: string, estado: string): Promise<Licencia> {
    const response = await api.patch<Licencia>(`/licencias/${id}/estado`, {
      estado,
    });
    return response.data;
  },
  async verificarLicencia(usuario_id: string): Promise<Licencia> {
    const response = await api.get(`/licencias/verificacion/${usuario_id}`);
    return response.data;
  },
};
