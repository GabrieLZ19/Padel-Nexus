import { api } from "../api";
import type { Perfil } from "../types";
import type { ComunicacionesEtiqueta } from "../types/comunicaciones.types";

export type FiltroContactoCrm = "todos" | "con_licencia" | "sin_licencia";

export interface CrmContactosResumen {
  registrados: number;
  con_licencia: number;
  sin_licencia: number;
}

export interface PaginatedContactosCrm {
  data: Perfil[];
  total: number;
  resumen?: CrmContactosResumen;
}

export const CrmContactosService = {
  async listar(
    page: number,
    limit: number,
    search?: string,
    filtro: FiltroContactoCrm = "todos",
    etiqueta?: ComunicacionesEtiqueta,
  ): Promise<PaginatedContactosCrm> {
    const res = await api.get("/admin/crm-contactos", {
      params: {
        page,
        limit,
        search: search?.trim() || undefined,
        filtro,
        etiqueta,
      },
    });
    return {
      data: res.data?.data ?? [],
      total: res.data?.total ?? 0,
      resumen: res.data?.resumen,
    };
  },

  async actualizarEtiquetas(
    perfilId: string,
    etiquetas: ComunicacionesEtiqueta[],
  ): Promise<ComunicacionesEtiqueta[]> {
    const res = await api.patch(`/admin/crm-contactos/${perfilId}/etiquetas`, {
      etiquetas,
    });
    return (res.data?.data?.etiquetas_contacto ?? []) as ComunicacionesEtiqueta[];
  },
};
