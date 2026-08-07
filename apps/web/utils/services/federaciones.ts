import { api } from "@/utils/api";

export interface Federacion {
  id: string;
  nombre: string;
  sigla?: string | null;
  pais?: string | null;
  estado?: string | null;
  logo_url?: string | null;
  descripcion?: string | null;
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

  getFap: async (): Promise<Federacion | null> => {
    const list = await FederacionesService.getAll();
    return (
      list.find((f) => (f.sigla || "").toUpperCase() === "FAP") ||
      list.find((f) => /federaci[oó]n argentina/i.test(f.nombre || "")) ||
      null
    );
  },
};
