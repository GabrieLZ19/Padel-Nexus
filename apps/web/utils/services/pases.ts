import { api } from "@/utils/api";

export interface PaseRepresentacion {
  id: string;
  usuario_id: string;
  asociacion_origen_id: string;
  asociacion_destino_id: string;
  estado: "pendiente" | "aprobado" | "rechazado" | "cancelado";
  motivo: string;
  created_at?: string;
  origen?: { id: string; nombre: string; provincia?: string | null } | null;
  destino?: { id: string; nombre: string; provincia?: string | null } | null;
  perfiles?: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
    dni?: string | null;
  } | null;
}

export const PasesService = {
  async solicitar(asociacionDestinoId: string, motivo: string): Promise<PaseRepresentacion> {
    const response = await api.post<{ exito: boolean; data: PaseRepresentacion }>("/pases", {
      asociacion_destino_id: asociacionDestinoId,
      motivo,
    });
    return response.data.data;
  },

  async listarMios(): Promise<PaseRepresentacion[]> {
    const response = await api.get<{ exito: boolean; data: PaseRepresentacion[] }>("/pases/mios");
    return response.data.data || [];
  },

  async cancelar(id: string): Promise<PaseRepresentacion> {
    const response = await api.patch<{ exito: boolean; data: PaseRepresentacion }>(
      `/pases/${id}/cancelar`,
    );
    return response.data.data;
  },

  async listarPendientes(): Promise<PaseRepresentacion[]> {
    const response = await api.get<{ exito: boolean; data: PaseRepresentacion[] }>(
      "/pases/pendientes",
    );
    return response.data.data || [];
  },

  async resolver(id: string, estado: "aprobado" | "rechazado"): Promise<PaseRepresentacion> {
    const response = await api.patch<{ exito: boolean; data: PaseRepresentacion }>(
      `/pases/${id}/estado`,
      { estado },
    );
    return response.data.data;
  },
};
