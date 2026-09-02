import { api } from "../api";
import { Licencia, Perfil } from "../types";

interface DatosSolicitud {
  nombre: string;
  apellido: string;
  documento: string;
  club_id: string;
  provincia: string;
}

export interface PaginatedLicencias {
  data: Perfil[];
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
    estado?: Licencia["estado"],
  ): Promise<PaginatedLicencias> {
    const response = await api.get<PaginatedLicencias | Perfil[]>(
      "/licencias",
      {
        params: {
          page,
          limit,
          search,
          ...(estado ? { estado } : {}),
        },
      },
    );

    const payload = response.data as PaginatedLicencias | Perfil[];
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
  async updateEstado(id: string, estado: string, fecha_vencimiento?: string): Promise<Licencia> {
    const response = await api.patch<Licencia>(`/licencias/${id}/estado`, {
      estado,
      fecha_vencimiento,
    });
    return response.data;
  },
  async verificarLicencia(usuario_id: string): Promise<Licencia> {
    const response = await api.get(`/licencias/verificacion/${usuario_id}`);
    return response.data;
  },
};
