import { api } from "@/utils/api";

export interface Fiscal {
  id: string;
  nombre: string;
  apellido: string;
  dni: string;
  direccion?: string;
  correo?: string;
  rango: "Local" | "Regional" | "Provincial" | "Nacional";
  asociacion?: string;
  activo?: boolean;
  usuario_id?: string | null;
  created_at?: string;
  /** Rol en el torneo: general | auxiliar */
  rol_torneo?: "general" | "auxiliar";
}

export interface AccesoFiscal {
  fiscal_id: string;
  email: string;
  password_temporal: string | null;
  modo: "creado" | "restablecido" | "vinculado";
  mensaje: string;
}

export const FiscalesService = {
  getAll: async (): Promise<Fiscal[]> => {
    try {
      const res = await api.get("/torneos/fiscales/lista");
      return res.data?.data || res.data || [];
    } catch (error) {
      console.warn("Error al obtener fiscales des del servicio:", error);
      return [];
    }
  },

  getByDni: async (dni: string): Promise<Fiscal | null> => {
    try {
      const res = await api.get(`/torneos/fiscales/dni/${dni}`);
      return res.data?.data || res.data || null;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return null;
      }
      console.warn(`No se encontró fiscal para el DNI ${dni}`);
      return null;
    }
  },

  getByTorneo: async (torneoId: string): Promise<Fiscal[]> => {
    try {
      const res = await api.get(`/torneos/${torneoId}/fiscales`);
      return res.data?.data || res.data || [];
    } catch (error) {
      console.error(`Error al obtener fiscales del torneo ${torneoId}:`, error);
      return [];
    }
  },

  asignarATorneo: async (
    torneoId: string,
    fiscalIds: string[],
    rolesById?: Record<string, "general" | "auxiliar">,
  ): Promise<boolean> => {
    try {
      await api.post(`/torneos/${torneoId}/fiscales`, {
        fiscal_ids: fiscalIds,
        roles_by_id: rolesById,
      });
      return true;
    } catch (error) {
      console.error("Error al asignar fiscales al torneo:", error);
      throw error;
    }
  },

  create: async (fiscal: Partial<Fiscal>): Promise<Fiscal> => {
    try {
      const res = await api.post("/torneos/fiscales", fiscal);
      return res.data?.data || res.data;
    } catch (error) {
      console.error("Error al crear fiscal:", error);
      throw error;
    }
  },

  update: async (id: string, fiscal: Partial<Fiscal>): Promise<Fiscal> => {
    try {
      const res = await api.put(`/torneos/fiscales/${id}`, fiscal);
      return res.data?.data || res.data;
    } catch (error) {
      console.error("Error al actualizar fiscal:", error);
      throw error;
    }
  },

  habilitarAcceso: async (
    id: string,
    payload?: { email?: string; password?: string },
  ): Promise<AccesoFiscal> => {
    const res = await api.post<AccesoFiscal>(`/torneos/fiscales/${id}/acceso`, payload || {});
    return res.data;
  },

  cambiarEstado: async (id: string, activo: boolean): Promise<Fiscal> => {
    try {
      const res = await api.patch(`/torneos/fiscales/${id}/estado`, { activo });
      return res.data?.data || res.data;
    } catch (error) {
      console.error("Error al cambiar estado del fiscal:", error);
      throw error;
    }
  },
};
