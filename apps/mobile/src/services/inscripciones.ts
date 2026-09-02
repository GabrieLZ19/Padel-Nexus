import { isAxiosError } from "axios";

import { api } from "@/src/services/api";
import type { ElegibilidadInscripcion } from "@/src/types/competencia.types";

function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export const InscripcionesService = {
  async chequearElegibilidad(params: {
    torneo_id: string;
    usuario2_email?: string;
  }): Promise<ElegibilidadInscripcion> {
    try {
      const response = await api.get<ElegibilidadInscripcion>(
        "/inscripciones/elegibilidad",
        {
          params: {
            torneo_id: params.torneo_id,
            usuario2_email: params.usuario2_email || undefined,
          },
        },
      );
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo validar la elegibilidad."),
      );
    }
  },

  async inscribir(data: {
    torneo_id: string;
    usuario_id: string;
    usuario2_email?: string | null;
    jugador1_nombre: string;
    jugador2_nombre: string;
    monto: number;
  }) {
    try {
      const response = await api.post("/inscripciones", data);
      return response.data;
    } catch (error: unknown) {
      throw new Error(
        getErrorMessage(error, "No se pudo completar la inscripción."),
      );
    }
  },
};
