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
    return response.data?.data || response.data as Reserva;
  },

  async getPorClub(clubId: string, options?: any): Promise<any> {
    const response = await api.get(`/reservas/club/${clubId}`, { params: options });
    return response.data?.data || response.data;
  },

  async getPagosPendientes(clubId: string): Promise<any> {
    const response = await api.get("/reservas/pagos/pendientes", {
      params: { club_id: clubId },
    });
    return response.data?.data || response.data;
  },

  async validarPago(pagoId: string, aprobado: boolean): Promise<any> {
    const response = await api.post(`/reservas/pagos/${pagoId}/validar`, { aprobado });
    return response.data?.data || response.data;
  },

  async getReservasDisponibles(params: any): Promise<any> {
    const response = await api.get("/reservas/disponibles", { params });
    return response.data?.data || response.data;
  },

  async getMisReservas(): Promise<any> {
    const response = await api.get("/reservas/mis-reservas");
    return response.data?.data || response.data;
  },

  async getReservaById(id: string): Promise<any> {
    const response = await api.get(`/reservas/${id}`);
    return response.data?.data || response.data;
  },

  async getTurnoInfo(turnoId: string): Promise<any> {
    const response = await api.get(`/reservas/turno/${turnoId}`);
    return response.data?.data || response.data;
  },

  async confirmarRetornoMercadoPago(reservaId: string, paymentId: string): Promise<any> {
    const response = await api.post(`/reservas/${reservaId}/confirmar-retorno`, { payment_id: paymentId });
    return response.data?.data || response.data;
  },

  async crearPreReserva(payload: any): Promise<any> {
    const response = await api.post("/reservas", payload);
    return response.data?.data || response.data;
  },

  async iniciarPagoMercadoPago(reservaId: string): Promise<any> {
    const response = await api.post(`/reservas/${reservaId}/preferencia-mp`);
    return response.data?.data || response.data;
  },

  async pagarReserva(reservaId: string, payload: any): Promise<any> {
    const response = await api.post(`/reservas/${reservaId}/pagar`, payload);
    return response.data?.data || response.data;
  },
};
