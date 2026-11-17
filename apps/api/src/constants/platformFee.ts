export const PLATFORM_FEE_CANALES = [
  "inscripciones",
  "licencias",
  "reservas",
  "marketplace",
] as const;

export type PlatformFeeCanal = (typeof PLATFORM_FEE_CANALES)[number];

export type PlatformFeeTipo = "fijo" | "porcentaje";
export type PlatformFeeModo = "absorber" | "sumar";

export type PlatformFeeOrgTipo = "club" | "asociacion" | "federacion";

export type PlatformFeeEstado =
  | "pendiente_organizador"
  | "cobrado_mp"
  | "descontar_liquidacion"
  | "liquidado";

export type PlatformFeeOrigen =
  | "mp_online"
  | "manual"
  | "planilla"
  | "saldo_torneo";

export interface PlatformFeeOrgRef {
  org_tipo: PlatformFeeOrgTipo;
  org_id: string;
}

export interface PlatformFeeCheckoutBreakdown {
  montoBruto: number;
  montoFee: number;
  montoTotal: number;
  modo: PlatformFeeModo;
  plazas?: number;
  discriminadoEnCheckout: boolean;
}