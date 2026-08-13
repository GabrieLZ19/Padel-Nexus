import { api } from "../api";
import type { Afiliacion } from "../types";

export type AfiliacionConRelaciones = Afiliacion & {
  club_id?: string | null;
  asociacion_id?: string | null;
  clubes?: { id: string; nombre: string; provincia?: string; localidad?: string } | null;
  asociaciones?: { id: string; nombre: string; sigla?: string } | null;
  perfiles?: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
    dni?: string | null;
  } | null;
};

export const AfiliacionesService = {
  async solicitar(clubId: string): Promise<AfiliacionConRelaciones> {
    const response = await api.post<{ exito: boolean; data: AfiliacionConRelaciones }>(
      "/afiliaciones",
      { club_id: clubId },
    );
    return response.data.data;
  },

  async listarMias(): Promise<AfiliacionConRelaciones[]> {
    const response = await api.get<{ exito: boolean; data: AfiliacionConRelaciones[] }>(
      "/afiliaciones/mias",
    );
    return response.data.data || [];
  },

  async cancelar(id: string): Promise<unknown> {
    const response = await api.patch(`/afiliaciones/${id}/cancelar`);
    return response.data;
  },

  async listarAdmin(params?: {
    page?: number;
    limit?: number;
    estado?: string;
    search?: string;
  }): Promise<{ data: AfiliacionConRelaciones[]; total: number }> {
    const response = await api.get<{
      exito: boolean;
      data: AfiliacionConRelaciones[];
      total: number;
    }>("/afiliaciones", { params });
    return {
      data: response.data.data || [],
      total: response.data.total || 0,
    };
  },

  async cambiarEstado(id: string, estado: string): Promise<AfiliacionConRelaciones> {
    const response = await api.patch<{
      exito: boolean;
      data: AfiliacionConRelaciones;
    }>(`/afiliaciones/${id}/estado`, { estado });
    return response.data.data;
  },
};
