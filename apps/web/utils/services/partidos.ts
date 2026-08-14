import { api } from "../api";
import type {
  FiltrosPartidosAbiertos,
  PartidoAbierto,
  PublicarPartidoAbiertoPayload,
} from "../types";

export const PartidosService = {
  async getAbiertos(
    params?: FiltrosPartidosAbiertos,
  ): Promise<PartidoAbierto[]> {
    const { data } = await api.get("/partidos/abiertos", { params });
    return data.data || [];
  },

  async publicar(
    payload: PublicarPartidoAbiertoPayload,
  ): Promise<PartidoAbierto> {
    const { data } = await api.post("/partidos/publicar", payload);
    return data.data;
  },

  async unirse(
    partidoId: string,
  ): Promise<{ nuevosFaltantes: number; estado: string; mensaje?: string }> {
    const { data } = await api.post(`/partidos/${partidoId}/unirse`);
    return data;
  },

  async getPorReserva(
    reservaId: string,
  ): Promise<{ id: string; estado: string } | null> {
    const { data } = await api.get(`/partidos/por-reserva/${reservaId}`);
    return data.data || null;
  },
};
