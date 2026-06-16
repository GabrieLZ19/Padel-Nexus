import { api } from "../api";
import { Licencia } from "../types";

interface DatosSolicitud {
  nombre_completo: string;
  documento: string;
  club: string;
  provincia: string;
}

export const LicenciasService = {
  // Para el Admin
  async getAll(): Promise<Licencia[]> {
    const response = await api.get<Licencia[]>("/licencias");
    return response.data;
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
