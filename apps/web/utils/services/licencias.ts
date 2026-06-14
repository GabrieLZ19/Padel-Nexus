import { api } from "../api";
import { Licencia } from "../types";

export const LicenciasService = {
  /**
   * Trae todas las licencias del ecosistema con sus relaciones de perfil
   */
  async getAll(): Promise<Licencia[]> {
    const response = await api.get<Licencia[]>("/licencias");
    return response.data;
  },

  /**
   * Actualiza el estado de aprobación de una licencia específica
   */
  async updateEstado(
    id: string | number,
    estado: Licencia["estado"],
  ): Promise<Licencia> {
    const response = await api.patch<Licencia>(`/licencias/${id}/estado`, {
      estado,
    });
    return response.data;
  },
};
