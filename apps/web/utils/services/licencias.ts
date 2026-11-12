import { api } from "../api";
import { Licencia, Perfil } from "../types";

interface DatosSolicitud {
  nombre: string;
  apellido: string;
  documento: string;
  club_id?: string;
  provincia: string;
}

export interface ResumenLicencias {
  total: number;
  pendientes: number;
  vigentes: number;
  vencidas: number;
  suspendidas: number;
  otros: number;
}

export interface PaginatedLicencias {
  data: Perfil[];
  total: number;
  resumen?: ResumenLicencias;
}

export type LicenciaVigenciaModo = "fecha_fija" | "meses_desde_emision";
export type LicenciaFrecuenciaPago = "anual" | "mensual";

export interface LicenciaOrganizacionConfig {
  precioAnual: number;
  vigenciaModo: LicenciaVigenciaModo;
  vencimientoMes: number | null;
  vencimientoDia: number | null;
  vigenciaMeses: number;
  nombreCarne: string | null;
  frecuenciaPago: LicenciaFrecuenciaPago;
  precioMensual: number;
  diaCobro: number | null;
  pagoAlias?: string | null;
  pagoCbu?: string | null;
  pagoTitular?: string | null;
  origen?: string;
}

export interface LicenciaConfigData {
  config: LicenciaOrganizacionConfig;
  descripcion_vigencia: string;
  hereda_de_federacion?: boolean;
  entidad_nombre?: string;
  subtitulo?: string;
  puede_editar?: boolean;
  tipo?: "federacion" | "asociacion";
  provincia?: string | null;
  asociacion_id?: string;
  federacion_id?: string;
}

export interface LicenciaConfigPayload {
  precio_anual?: number;
  vigencia_modo?: LicenciaVigenciaModo;
  vencimiento_mes?: number | null;
  vencimiento_dia?: number | null;
  vigencia_meses?: number;
  nombre_carne?: string | null;
  frecuencia_pago?: LicenciaFrecuenciaPago;
  precio_mensual?: number;
  dia_cobro?: number | null;
  pago_alias?: string | null;
  pago_cbu?: string | null;
  pago_titular?: string | null;
}

export interface LicenciaCotizacion {
  precio_anual: number;
  precio_mensual: number;
  frecuencia_pago: LicenciaFrecuenciaPago;
  moneda: string;
  nombre_carne?: string | null;
  descripcion_vigencia?: string;
}

export interface LicenciaPreferenciaPago {
  preferenceId?: string | null;
  initPoint?: string | null;
  sandboxInitPoint?: string | null;
  mockConfirmed?: boolean;
  paymentId?: string;
  licencia?: Licencia;
  pagoAlternativo?: boolean;
  monto?: number;
  moneda?: string;
  referencia?: string;
  instrucciones?: string;
  alias?: string | null;
  cbu?: string | null;
  titular?: string | null;
  transferencia_disponible?: boolean;
}

export interface LicenciaDatosTransferencia {
  transferencia_disponible: boolean;
  monto?: number;
  moneda?: string;
  referencia?: string;
  instrucciones?: string | null;
  alias?: string | null;
  cbu?: string | null;
  titular?: string | null;
}

export interface LicenciaPago {
  id: string;
  licencia_id: string;
  usuario_id: string;
  periodo: string;
  monto: number;
  estado: string;
  metodo?: string | null;
  mp_payment_id?: string | null;
  notas?: string | null;
  pagado_en: string;
  created_at?: string;
  registrado_por?: string | null;
}

function unwrapData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as { data: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const LicenciasService = {
  async getAll(): Promise<Licencia[]> {
    const response = await api.get("/licencias");
    return unwrapData<Licencia[]>(response.data);
  },

  async getByPage(
    page: number,
    limit: number,
    search?: string,
    estado?: Licencia["estado"],
  ): Promise<PaginatedLicencias> {
    const response = await api.get<PaginatedLicencias | Perfil[]>(
      "/licencias",
      {
        params: {
          page,
          limit,
          search,
          ...(estado ? { estado } : {}),
        },
      },
    );

    const payload = response.data as
      | PaginatedLicencias
      | Perfil[]
      | { exito?: boolean; data?: Perfil[]; total?: number };
    if (Array.isArray(payload)) {
      return { data: payload, total: payload.length };
    }
    if ("data" in payload && Array.isArray(payload.data)) {
      const resumen =
        "resumen" in payload && payload.resumen && typeof payload.resumen === "object"
          ? (payload.resumen as PaginatedLicencias["resumen"])
          : undefined;
      return {
        data: payload.data,
        total: typeof payload.total === "number" ? payload.total : payload.data.length,
        resumen,
      };
    }
    return payload as PaginatedLicencias;
  },

  async solicitarAlta(data: DatosSolicitud): Promise<Licencia> {
    const response = await api.post("/licencias/solicitar", data);
    return unwrapData<Licencia>(response.data);
  },

  async cotizar(params: {
    club_id?: string;
    provincia?: string;
  }): Promise<LicenciaCotizacion> {
    const response = await api.get("/licencias/cotizacion", { params });
    return unwrapData<LicenciaCotizacion>(response.data);
  },

  async crearPreferenciaMp(
    licenciaId: string,
  ): Promise<LicenciaPreferenciaPago> {
    const response = await api.post(`/licencias/${licenciaId}/preferencia-mp`);
    return unwrapData<LicenciaPreferenciaPago>(response.data);
  },

  async getDatosTransferencia(
    licenciaId: string,
  ): Promise<LicenciaDatosTransferencia> {
    const response = await api.get(
      `/licencias/${licenciaId}/datos-transferencia`,
    );
    return unwrapData<LicenciaDatosTransferencia>(response.data);
  },

  async confirmarRetornoMp(
    licenciaId: string,
    paymentId: string,
  ): Promise<Licencia> {
    const response = await api.post(`/licencias/${licenciaId}/confirmar-retorno`, {
      payment_id: paymentId,
    });
    return unwrapData<Licencia>(response.data);
  },

  async updateEstado(
    id: string,
    estado: string,
    fecha_vencimiento?: string,
    motivo?: string,
  ): Promise<Licencia> {
    const response = await api.patch(`/licencias/${id}/estado`, {
      estado,
      fecha_vencimiento,
      ...(motivo?.trim() ? { motivo: motivo.trim() } : {}),
    });
    return unwrapData<Licencia>(response.data);
  },

  async getHistorial(licenciaId: string): Promise<
    Array<{
      id: string;
      accion: string;
      detalles: Record<string, unknown> | null;
      created_at: string;
      admin_nombre?: string | null;
    }>
  > {
    const response = await api.get(`/licencias/${licenciaId}/historial`);
    return unwrapData(response.data);
  },

  async darDeBaja(id: string): Promise<void> {
    await api.post(`/licencias/${id}/dar-de-baja`);
  },

  async verificarLicencia(usuario_id: string): Promise<Licencia> {
    const response = await api.get(`/licencias/verificacion/${usuario_id}`);
    return unwrapData<Licencia>(response.data);
  },

  async getConfigOrganizacion(): Promise<LicenciaConfigData> {
    const response = await api.get("/licencias/config-organizacion");
    return unwrapData<LicenciaConfigData>(response.data);
  },

  async updateConfigOrganizacion(
    payload: LicenciaConfigPayload,
  ): Promise<LicenciaConfigData> {
    const response = await api.patch("/licencias/config-organizacion", payload);
    return unwrapData<LicenciaConfigData>(response.data);
  },

  async getConfigFederacion(federacionId: string): Promise<LicenciaConfigData> {
    const response = await api.get(
      `/federaciones/${federacionId}/config-licencia`,
    );
    return unwrapData<LicenciaConfigData>(response.data);
  },

  async updateConfigFederacion(
    federacionId: string,
    payload: LicenciaConfigPayload,
  ): Promise<LicenciaConfigData> {
    const response = await api.patch(
      `/federaciones/${federacionId}/config-licencia`,
      payload,
    );
    return unwrapData<LicenciaConfigData>(response.data);
  },

  async getConfigAsociacion(asociacionId: string): Promise<LicenciaConfigData> {
    const response = await api.get(
      `/asociaciones/${asociacionId}/config-licencia`,
    );
    return unwrapData<LicenciaConfigData>(response.data);
  },

  async updateConfigAsociacion(
    asociacionId: string,
    payload: LicenciaConfigPayload,
  ): Promise<LicenciaConfigData> {
    const response = await api.patch(
      `/asociaciones/${asociacionId}/config-licencia`,
      payload,
    );
    return unwrapData<LicenciaConfigData>(response.data);
  },

  async listarPagos(licenciaId: string): Promise<LicenciaPago[]> {
    const response = await api.get(`/licencias/${licenciaId}/pagos`);
    return unwrapData<LicenciaPago[]>(response.data);
  },

  async registrarPago(
    licenciaId: string,
    payload: {
      monto?: number;
      periodo?: string;
      metodo?: string;
      notas?: string;
    },
  ): Promise<{ pago: LicenciaPago; licencia: Licencia; fecha_vencimiento: string }> {
    const response = await api.post(`/licencias/${licenciaId}/pagos`, payload);
    return unwrapData(response.data);
  },
};
