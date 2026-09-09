export const LEGAL_TIPOS = [
  "tyc",
  "privacidad",
  "privacidad_menores",
  "consentimiento_parental",
] as const;

export type LegalTipo = (typeof LEGAL_TIPOS)[number];

export const CUENTA_ESTADOS = [
  "ACTIVE_ADULT",
  "DRAFT_MINOR",
  "PENDING_PARENTAL_CONSENT",
  "ACTIVE_MINOR_RESTRICTED",
  "CONSENT_PARTIALLY_REVOKED",
  "SUSPENDED_MINOR",
  "ADULT_TRANSITION_PENDING",
] as const;

export type CuentaEstado = (typeof CUENTA_ESTADOS)[number];

export const CONSENT_TIPOS = [
  "ESSENTIAL",
  "PUBLIC_PROFILE",
  "PHOTO",
  "MARKETING",
  "FUNCTIONAL_COMMS",
  "MINOR_ASSENT",
] as const;

export type ConsentTipo = (typeof CONSENT_TIPOS)[number];

export const CONSENT_STATUS = [
  "GRANTED",
  "DENIED",
  "REVOKED",
  "EXPIRED",
] as const;

export type ConsentStatus = (typeof CONSENT_STATUS)[number];

/** Versiones esperadas en piloto (deben coincidir con seed DB). */
export const LEGAL_VERSIONES_PILOTO = {
  tyc: "1.1",
  privacidad: "1.0-piloto",
  privacidad_menores: "1.0",
  consentimiento_parental: "1.0",
} as const;

export const TOKEN_PARENTAL_DIAS_VALIDEZ = 14;
