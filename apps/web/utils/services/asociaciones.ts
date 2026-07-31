import { api } from "@/utils/api";

export interface Asociacion {
  id: string;
  nombre: string;
  sigla?: string;
  provincia: string;
  localidad: string;
  tipo?: "asociacion" | "agrupacion" | "federacion";
  estado?: "activo" | "inactivo" | "pendiente";
  estado_aprobacion?: "activo" | "inactivo" | "pendiente_aprobacion" | "rechazado";
  torneos_count?: number;
  jugadores_count?: number;
  latitud?: number;
  longitud?: number;
  direccion?: string;
  telefono?: string;
  email?: string;
}

export const AsociacionesService = {
  getAll: async (search?: string, provincia?: string): Promise<Asociacion[]> => {
    try {
      const res = await api.get("/asociaciones", {
        params: { search, provincia },
      });
      const raw = res.data;
      const items = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
      return items;
    } catch (error) {
      console.warn("Error al obtener asociaciones:", error);
      return [];
    }
  },

  getById: async (id: string): Promise<Asociacion | null> => {
    try {
      const res = await api.get(`/asociaciones/${id}`);
      return res.data?.data || res.data || null;
    } catch (error) {
      console.warn(`Error al obtener asociación con id ${id}:`, error);
      return null;
    }
  },

  create: async (datos: Partial<Asociacion>): Promise<Asociacion> => {
    try {
      const res = await api.post("/asociaciones", datos);
      return res.data?.data || res.data;
    } catch (error) {
      console.error("Error al crear asociación:", error);
      throw error;
    }
  },

  update: async (id: string, datos: Partial<Asociacion>): Promise<Asociacion> => {
    try {
      const res = await api.put(`/asociaciones/${id}`, datos);
      return res.data?.data || res.data;
    } catch (error) {
      console.error("Error al actualizar asociación:", error);
      throw error;
    }
  },

  cambiarEstado: async (id: string, estado: "activo" | "inactivo" | "pendiente"): Promise<Asociacion> => {
    try {
      const res = await api.patch(`/asociaciones/${id}/estado`, { estado });
      return res.data?.data || res.data;
    } catch (error) {
      console.error("Error al cambiar estado de asociación:", error);
      throw error;
    }
  },

  getClubes: async (asociacionId: string) => {
    try {
      const res = await api.get(`/asociaciones/${asociacionId}/clubes`);
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.warn(`No se pudieron cargar clubes para la asociación ${asociacionId}:`, error);
      return [];
    }
  },

  getTorneos: async (asociacionId: string) => {
    try {
      const res = await api.get(`/asociaciones/${asociacionId}/torneos`);
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.warn(`No se pudieron cargar torneos para la asociación ${asociacionId}:`, error);
      return [];
    }
  },

  getJugadores: async (asociacionId: string) => {
    try {
      const res = await api.get(`/asociaciones/${asociacionId}/jugadores`);
      const items = res.data?.data || res.data || [];
      return Array.isArray(items) ? items : [];
    } catch (error) {
      console.warn(`No se pudieron obtener jugadores para la asociación ${asociacionId}:`, error);
      return [];
    }
  },
};
