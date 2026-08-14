import { api } from "@/utils/api";

export interface Federacion {
  id: string;
  nombre: string;
  sigla?: string | null;
  pais?: string | null;
  estado?: string | null;
  logo_url?: string | null;
  descripcion?: string | null;
  asociaciones_count?: number;
  asociaciones?: FederacionAsociacion[];
}

export interface FederacionAsociacion {
  id: string;
  nombre: string;
  sigla?: string | null;
  provincia?: string | null;
  localidad?: string | null;
  estado?: string | null;
  tipo?: string | null;
}

export interface FederacionPayload {
  nombre: string;
  sigla?: string;
  pais?: string;
  descripcion?: string;
}

export const FederacionesService = {
  getAll: async (): Promise<Federacion[]> => {
    try {
      const res = await api.get("/federaciones");
      const raw = res.data;
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];
      return items;
    } catch (error) {
      console.warn("Error al obtener federaciones:", error);
      return [];
    }
  },

  getById: async (id: string): Promise<Federacion | null> => {
    try {
      const res = await api.get(`/federaciones/${id}`);
      return res.data?.data || res.data || null;
    } catch (error) {
      console.warn(`Error al obtener federación ${id}:`, error);
      return null;
    }
  },

  create: async (datos: FederacionPayload): Promise<Federacion> => {
    const res = await api.post("/federaciones", datos);
    return res.data?.data || res.data;
  },

  update: async (id: string, datos: Partial<FederacionPayload>): Promise<Federacion> => {
    const res = await api.put(`/federaciones/${id}`, datos);
    return res.data?.data || res.data;
  },

  cambiarEstado: async (id: string, estado: "activo" | "inactivo"): Promise<Federacion> => {
    const res = await api.patch(`/federaciones/${id}/estado`, { estado });
    return res.data?.data || res.data;
  },

  getFap: async (): Promise<Federacion | null> => {
    const list = await FederacionesService.getAll();
    return (
      list.find((f) => (f.sigla || "").toUpperCase() === "FAP") ||
      list.find((f) => /federaci[oó]n argentina/i.test(f.nombre || "")) ||
      null
    );
  },
};
