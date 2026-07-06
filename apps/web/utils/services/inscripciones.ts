import { api } from "../api";
import { Inscripcion } from "../types";
export interface PaginatedInscripciones {
  data: Inscripcion[];
  total: number;
}

export const InscripcionesService = {
  async getAll(): Promise<Inscripcion[]> {
    const response = await api.get<PaginatedInscripciones | Inscripcion[]>(
      "/inscripciones",
    );
    const payload = response.data as PaginatedInscripciones | Inscripcion[];
    if (Array.isArray(payload)) {
      return payload;
    }
    return Array.isArray(payload.data) ? payload.data : [];
  },
  async getByPage(
    torneoId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedInscripciones> {
    const response = await api.get<PaginatedInscripciones>(`/inscripciones`, {
      params: { torneo_id: torneoId, page, limit },
    });
    return response.data;
  },
  async updateEstado(
    id: string | number,
    estado_pago: string,
  ): Promise<Inscripcion> {
    const response = await api.patch<Inscripcion>(`/inscripciones/${id}/pago`, {
      estado_pago,
    });
    return response.data;
  },
  async inscribir(data: {
    torneo_id: string;
    usuario_id: string;
    usuario2_email?: string | null;
    jugador1_nombre: string;
    jugador2_nombre: string;
    monto: number;
  }) {
    const response = await api.post("/inscripciones", data);
    return response.data;
  },
  async inscribirManual(data: {
    torneo_id: string;
    jugador1_identificador: string;
    jugador2_identificador?: string;
    monto: number;
    metodo_pago?: string;
  }) {
    const response = await api.post("/inscripciones/manual", data);
    return response.data;
  },
  async eliminar(id: string | number): Promise<void> {
    await api.delete(`/inscripciones/${id}`);
  },
};
