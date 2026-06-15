import { api } from "../api";
import type { Reserva } from "../types";

export const ReservasService = {
  async crear(data: {
    cancha_id: string;
    fecha: string;
    hora_inicio: string;
    duracion: number;
  }): Promise<Reserva> {
    const response = await api.post("/reservas", data);
    return response.data as Reserva;
  },

  async getPorClub(clubId: string): Promise<Reserva[]> {
    const response = await api.get(`/reservas/club/${clubId}`);
    return response.data as Reserva[];
  },
};
