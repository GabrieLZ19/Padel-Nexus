import { api } from "../api";
import type { FilaPlanillaInscripcion } from "../inscripcionPlanilla";
import { Inscripcion } from "../types";

export interface PaginatedInscripciones {
  data: Inscripcion[];
  total: number;
}

export type CheckElegibilidadApi = {
  code: string;
  label: string;
  passed: boolean;
  message?: string;
};

export type ElegibilidadResponse = {
  exito?: boolean;
  ok: boolean;
  torneo: {
    id: string;
    nivel?: string | null;
    rama?: string | null;
    requiere_carnet: boolean;
    requiere_afiliacion: boolean;
  };
  jugador1: {
    id: string;
    nombre: string;
    categoria_padel?: string | null;
  };
  jugador2: {
    id: string;
    nombre: string;
    email: string | null;
    categoria_padel: string | null;
  } | null;
  checks: CheckElegibilidadApi[];
  checks_j1: CheckElegibilidadApi[];
  checks_j2: CheckElegibilidadApi[];
};

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
  async chequearElegibilidad(params: {
    torneo_id: string;
    usuario2_email?: string;
  }): Promise<ElegibilidadResponse> {
    const response = await api.get<ElegibilidadResponse>(
      "/inscripciones/elegibilidad",
      {
        params: {
          torneo_id: params.torneo_id,
          usuario2_email: params.usuario2_email || undefined,
        },
      },
    );
    return response.data;
  },
  async inscribirManual(data: {
    torneo_id: string;
    jugador1_identificador: string;
    jugador2_identificador?: string;
    monto: number;
    metodo_pago?: string;
    omitir_validaciones?: boolean;
    motivo?: string;
    letra_prioridad?: string;
  }) {
    const response = await api.post("/inscripciones/manual", data);
    return response.data;
  },
  async importarPlanilla(data: {
    torneo_id: string;
    filas: FilaPlanillaInscripcion[];
    modalidad?: string;
    omitir_validaciones?: boolean;
    motivo?: string;
  }) {
    const response = await api.post<{
      exito: boolean;
      inscripcionesOk: number;
      jugadoresCreados: number;
      errores: string[];
      totalFilas: number;
    }>("/inscripciones/importar-planilla", data);
    return response.data;
  },
  async eliminar(id: string | number): Promise<void> {
    await api.delete(`/inscripciones/${id}`);
  },
};
