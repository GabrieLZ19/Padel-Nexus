import { api } from "../api";
import type { FilaPlanillaInscripcion } from "../inscripcionPlanilla";
import { Inscripcion } from "../types";

export interface PaginatedInscripciones {
  data: Inscripcion[];
  total: number;
  resumen?: {
    pendientes: number;
    confirmadas: number;
    rechazadas: number;
    recaudacion: number;
  };
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

export type PreferenciaInscripcionMp = {
  preferenceId: string | null;
  initPoint: string | null;
  sandboxInitPoint: string | null;
  monto: number;
  monto_bruto?: number;
  cargo_servicio?: number;
  modo_fee?: "absorber" | "sumar";
  plazas?: number;
  precio_por_plaza?: number;
  plazas_cobradas?: number[];
  alcance?: "mi_plaza" | "todas_pendientes";
  moneda: string;
  inscripcionId: string;
  torneoId: string;
};

export type EstadoPlazasPagoInscripcion = {
  inscripcion_id: string;
  mi_plaza: number;
  precio_por_jugador: number;
  plazas: Array<{ numero: number; estado: string; usuario_id: string | null }>;
  plazas_pendientes: number[];
  puede_pagar_mi_plaza: boolean;
  puede_pagar_todas: boolean;
  puede_pagar_resto: boolean;
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
  async getResumen(): Promise<NonNullable<PaginatedInscripciones["resumen"]>> {
    const vacio = { pendientes: 0, confirmadas: 0, rechazadas: 0, recaudacion: 0 };
    const response = await api.get<PaginatedInscripciones>("/inscripciones", {
      params: { page: 1, limit: 1 },
    });
    return response.data.resumen ?? vacio;
  },
  async getByPage(
    torneoId: string,
    page: number,
    limit: number,
    filtros?: { search?: string; estadoPago?: string },
  ): Promise<PaginatedInscripciones> {
    const response = await api.get<PaginatedInscripciones>(`/inscripciones`, {
      params: {
        torneo_id: torneoId || undefined,
        page,
        limit,
        search: filtros?.search?.trim() || undefined,
        estado_pago: filtros?.estadoPago || undefined,
      },
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
    jugador1_datos?: {
      nombre?: string;
      apellido?: string;
      categoria_padel?: string;
      fecha_nacimiento?: string;
      telefono?: string;
    };
    jugador2_datos?: {
      nombre?: string;
      apellido?: string;
      categoria_padel?: string;
      fecha_nacimiento?: string;
      telefono?: string;
    };
    monto: number;
    metodo_pago?: string;
    omitir_validaciones?: boolean;
    motivo?: string;
    letra_prioridad?: string;
  }) {
    const response = await api.post("/inscripciones/manual", data);
    return response.data;
  },
  async importarPlanilla(
    data: {
      torneo_id: string;
      filas: FilaPlanillaInscripcion[];
      modalidad?: string;
      omitir_validaciones?: boolean;
      motivo?: string;
    },
    options?: {
      onUploadProgress?: (percent: number) => void;
    },
  ) {
    const response = await api.post<{
      exito: boolean;
      inscripcionesOk: number;
      jugadoresCreados: number;
      errores: string[];
      totalFilas: number;
    }>("/inscripciones/importar-planilla", data, {
      onUploadProgress: (event) => {
        if (!options?.onUploadProgress) return;
        if (!event.total || event.total <= 0) return;
        options.onUploadProgress(
          Math.round((event.loaded / event.total) * 100),
        );
      },
    });
    return response.data;
  },
  async eliminar(id: string | number): Promise<void> {
    await api.delete(`/inscripciones/${id}`);
  },
  async obtenerPlazasPago(
    inscripcionId: string,
  ): Promise<EstadoPlazasPagoInscripcion> {
    const response = await api.get<{
      exito: boolean;
      data: EstadoPlazasPagoInscripcion;
    }>(`/inscripciones/${inscripcionId}/plazas-pago`);
    return response.data.data;
  },
  async crearPreferenciaMp(
    inscripcionId: string,
    alcance: "mi_plaza" | "todas_pendientes" = "todas_pendientes",
  ): Promise<PreferenciaInscripcionMp> {
    const response = await api.post<{
      exito: boolean;
      data: PreferenciaInscripcionMp;
    }>(`/inscripciones/${inscripcionId}/preferencia-mp`, { alcance });
    return response.data.data;
  },
  async confirmarRetornoMp(
    inscripcionId: string,
    paymentId: string,
  ): Promise<Inscripcion> {
    const response = await api.post<{ exito: boolean; data: Inscripcion }>(
      `/inscripciones/${inscripcionId}/confirmar-retorno`,
      { payment_id: paymentId },
    );
    return response.data.data;
  },
};
