import { api } from "../api";

export type PlatformFeeCanal =
  | "inscripciones"
  | "licencias"
  | "reservas"
  | "marketplace";

export type PlatformFeeModo = "absorber" | "sumar";
export type PlatformFeeTipo = "fijo" | "porcentaje";

export const PlatformFeesService = {
  async listarCanales() {
    const { data } = await api.get("/platform-fees/canales");
    return data.data as Array<{
      canal: PlatformFeeCanal;
      tipo: PlatformFeeTipo;
      valor: number;
      activo: boolean;
    }>;
  },

  async actualizarCanal(
    canal: PlatformFeeCanal,
    payload: { tipo: PlatformFeeTipo; valor: number; activo: boolean },
  ) {
    const { data } = await api.patch(`/platform-fees/canales/${canal}`, payload);
    return data.data;
  },

  async obtenerPreferenciasOrg(params?: {
    org_tipo?: string;
    org_id?: string;
  }) {
    const { data } = await api.get("/platform-fees/preferencias-org", {
      params,
    });
    return data as {
      data: Array<{ canal: PlatformFeeCanal; modo: PlatformFeeModo }>;
      org: { org_tipo: string; org_id: string };
    };
  },

  async guardarPreferenciasOrg(
    preferencias: Array<{ canal: PlatformFeeCanal; modo: PlatformFeeModo }>,
    org?: { org_tipo: string; org_id: string },
  ) {
    const { data } = await api.put("/platform-fees/preferencias-org", {
      preferencias,
      org,
    });
    return data;
  },

  async saldoTorneo(torneoId: string) {
    const { data } = await api.get(`/platform-fees/torneos/${torneoId}/saldo`);
    return data.data as {
      torneo_id: string;
      cantidad_movimientos: number;
      saldo_pendiente: number;
      moneda: string;
    };
  },

  async crearPreferenciaSaldoTorneo(torneoId: string) {
    const { data } = await api.post(
      `/platform-fees/torneos/${torneoId}/saldo/preferencia-mp`,
      {},
    );
    return data.data as {
      initPoint?: string;
      sandboxInitPoint?: string;
      monto: number;
    };
  },

  async reporteMensual(anio: number, mes: number) {
    const { data } = await api.get("/platform-fees/reporte-mensual", {
      params: { anio, mes },
    });
    return data.data;
  },

  async liquidacionesPendientes() {
    const { data } = await api.get("/platform-fees/liquidaciones/pendientes");
    return data.data;
  },

  async resumenLiquidaciones() {
    const { data } = await api.get("/platform-fees/liquidaciones/resumen");
    return data.data as Array<{
      org_tipo: string;
      org_id: string;
      nombre: string;
      cbu: string | null;
      alias: string | null;
      bruto_online: number;
      fees_descontar: number;
      saldo_pendiente: number;
      comision_mp: number;
      comision_mp_porcentaje: number;
      monto_neto: number;
      movimientos: number;
    }>;
  },

  async historialLiquidaciones() {
    const { data } = await api.get("/platform-fees/liquidaciones/historial");
    return data.data;
  },

  async marcarLiquidacion(payload: {
    org: { org_tipo: string; org_id: string };
    periodo_mes: string;
    monto_bruto: number;
    monto_fees: number;
    monto_neto: number;
    cbu?: string;
    alias_cuenta?: string;
    notas?: string;
  }) {
    const { data } = await api.post("/platform-fees/liquidaciones", payload);
    return data.data;
  },
};