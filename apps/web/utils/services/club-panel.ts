import { api } from "../api";
import { Club, Cancha, Reserva } from "../types";

export class ClubPanelService {
  static async getMiClub(): Promise<Club> {
    const { data } = await api.get("/club/mi-club");
    return data.data;
  }

  static async actualizarMiClub(datos: Partial<Club>): Promise<Club> {
    const { data } = await api.put("/club/mi-club", datos);
    return data.data;
  }

  static async getCanchas(): Promise<Cancha[]> {
    const { data } = await api.get("/club/mi-club/canchas");
    return data.data || [];
  }

  static async crearCancha(datos: {
    nombre: string;
    tipo_suelo: string;
    techada: boolean;
  }): Promise<Cancha> {
    const { data } = await api.post("/club/mi-club/canchas", datos);
    return data.data;
  }

  static async actualizarCancha(
    canchaId: string,
    datos: {
      nombre?: string;
      tipo_suelo?: string;
      techada?: boolean;
      activa?: boolean;
    },
  ): Promise<Cancha> {
    const { data } = await api.put(`/club/mi-club/canchas/${canchaId}`, datos);
    return data.data;
  }

  static async eliminarCancha(canchaId: string): Promise<void> {
    await api.delete(`/club/mi-club/canchas/${canchaId}`);
  }

  static async crearTurno(
    canchaId: string,
    datos: {
      hora_inicio: string;
      hora_fin: string;
      precio: number;
      dia_semana: number;
    },
  ): Promise<any> {
    const { data } = await api.post(`/club/mi-club/canchas/${canchaId}/turnos`, datos);
    return data.data;
  }

  static async eliminarTurno(turnoId: string): Promise<void> {
    await api.delete(`/club/mi-club/turnos/${turnoId}`);
  }

  static async getReservas(filtros: {
    fecha?: string;
    estado_pago?: string;
    cancha_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number }> {
    const { data } = await api.get("/club/mi-club/reservas", { params: filtros });
    return { data: data.data || [], total: data.total || 0 };
  }

  static async getEstadisticas(): Promise<{
    canchas_totales: number;
    canchas_activas: number;
    reservas_mes: number;
    ingresos_estimados: number;
    tasa_ocupacion: number;
  }> {
    const { data } = await api.get("/club/mi-club/estadisticas");
    return data.data;
  }
}
