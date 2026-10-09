import { api } from "../api";
import {
  Club,
  Cancha,
  Reserva,
  Turno,
  BloqueoDisponibilidad,
  CrearBloqueoPayload,
} from "../types";

export type AccionReservaClub = "confirmar" | "cobrar" | "cancelar" | "ausente";

export interface ReservaClubFila {
  id: string;
  fecha_reserva: string;
  estado_pago: string;
  estado_reserva: string;
  perfiles?: {
    nombre?: string | null;
    apellido?: string | null;
    email?: string | null;
  } | null;
  turnos?: {
    hora_inicio?: string | null;
    hora_fin?: string | null;
    precio?: number | null;
    canchas?: { id?: string; nombre?: string | null } | null;
  } | null;
}

export interface AgendaReservasClub {
  fecha: string;
  canchas: { id: string; nombre: string }[];
  filas: {
    hora_inicio: string;
    hora_fin: string;
    celdas: {
      cancha_id: string;
      turno_id: string | null;
      reserva: {
        id: string;
        turno_id: string;
        estado_reserva: string;
        estado_pago: string;
        jugador: string;
        precio: number;
      } | null;
    }[];
  }[];
}

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
  ): Promise<Turno> {
    const { data } = await api.post(`/club/mi-club/canchas/${canchaId}/turnos`, datos);
    return data.data;
  }

  static async eliminarTurno(turnoId: string): Promise<void> {
    await api.delete(`/club/mi-club/turnos/${turnoId}`);
  }

  static async ajustarPreciosMasivos(datos: {
    cancha_id?: string;
    tipo_ajuste: "porcentaje" | "fijo";
    valor: number;
    franja?: "todos" | "pico" | "valle";
  }): Promise<{ actualizados: number }> {
    const { data } = await api.post("/club/mi-club/turnos/ajuste-precios", datos);
    return data.data || { actualizados: 0 };
  }

  static async crearPlantillaTurnos(datos: {
    cancha_ids: string[];
    dias: number[];
    slots: Array<{ hora_inicio: string; hora_fin: string; precio: number }>;
  }): Promise<{ creados: number; omitidos: number }> {
    const { data } = await api.post("/club/mi-club/turnos/plantilla-masiva", datos);
    return data.data || { creados: 0, omitidos: 0 };
  }

  static async getReservas(filtros: {
    fecha?: string;
    estado_pago?: string;
    cancha_id?: string;
    page?: number;
    limit?: number;
    solo_atrasadas?: boolean;
  }): Promise<{ data: ReservaClubFila[]; total: number; atrasadas: number }> {
    const { data } = await api.get("/club/mi-club/reservas", {
      params: {
        ...filtros,
        solo_atrasadas: filtros.solo_atrasadas ? "1" : undefined,
      },
    });
    return {
      data: data.data || [],
      total: data.total || 0,
      atrasadas: data.atrasadas || 0,
    };
  }

  static async getAgenda(fecha: string): Promise<AgendaReservasClub> {
    const { data } = await api.get("/club/mi-club/reservas/agenda", {
      params: { fecha },
    });
    return data.data;
  }

  static async gestionarReserva(
    reservaId: string,
    accion: AccionReservaClub,
  ): Promise<void> {
    await api.post(`/club/mi-club/reservas/${reservaId}/gestionar`, { accion });
  }

  static async getBloqueos(params?: {
    desde?: string;
    hasta?: string;
    todos?: boolean;
  }): Promise<BloqueoDisponibilidad[]> {
    const { data } = await api.get("/club/mi-club/bloqueos", {
      params: {
        desde: params?.desde,
        hasta: params?.hasta,
        todos: params?.todos ? "1" : undefined,
      },
    });
    return data.data || [];
  }

  static async crearBloqueo(
    payload: CrearBloqueoPayload,
  ): Promise<BloqueoDisponibilidad> {
    const { data } = await api.post("/club/mi-club/bloqueos", payload);
    return data.data;
  }

  static async eliminarBloqueo(
    bloqueoId: string,
    hard = false,
  ): Promise<void> {
    await api.delete(`/club/mi-club/bloqueos/${bloqueoId}`, {
      params: hard ? { hard: "1" } : undefined,
    });
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
