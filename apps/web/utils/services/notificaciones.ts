import { api } from "../api";
import { Notificacion } from "../types";

export const NotificacionesService = {
  async getAll(): Promise<Notificacion[]> {
    const response = await api.get<{ exito: boolean; data: Notificacion[] }>("/notificaciones");
    return response.data.data || [];
  },

  async markAsRead(id: string): Promise<Notificacion> {
    const response = await api.patch<{ exito: boolean; data: Notificacion }>(`/notificaciones/${id}/leida`);
    return response.data.data;
  },

  async markAllAsRead(): Promise<Notificacion[]> {
    const response = await api.post<{ exito: boolean; data: Notificacion[] }>("/notificaciones/leidas-todas");
    return response.data.data || [];
  },

  async delete(id: string): Promise<boolean> {
    const response = await api.delete<{ exito: boolean }>(`/notificaciones/${id}`);
    return response.data.exito;
  },
};
