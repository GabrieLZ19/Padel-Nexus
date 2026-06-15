import { api } from "../api";
import { Inscripcion } from "../types";

export const InscripcionesService = {
  async getAll(): Promise<Inscripcion[]> {
    const response = await api.get<Inscripcion[]>("/inscripciones");
    return response.data;
  },

  async updateEstado(
    id: string | number,
    estado_pago: string,
  ): Promise<Inscripcion> {
    const response = await api.put<Inscripcion>(`/inscripciones/${id}/estado`, {
      estado_pago,
    });
    return response.data;
  },
  async inscribir(data: {
    jugador1_nombre: string;
    jugador2_nombre: string;
    torneo_nombre: string;
    categoria: string;
    monto: number;
  }) {
    const response = await api.post("/inscripciones", data);
    return response.data;
  },
};
