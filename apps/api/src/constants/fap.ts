export const FAP_ESTADOS_TORNEO = {
  BORRADOR: "Borrador",
  INSCRIPCION: "Inscripción",
  EN_CURSO: "En curso",
  FINALIZADO: "Finalizado",
} as const;

export const FAP_ESTADOS_PAGO = {
  PENDIENTE: "Pendiente",
  CONFIRMADO: "Confirmado",
  RECHAZADO: "Rechazado",
} as const;

export const FAP_ESTADOS_LICENCIA = {
  PENDIENTE: "Pendiente",
  ACTIVA: "Activa",
  VENCIDA: "Vencida",
  SUSPENDIDA: "Suspendida",
} as const;

export const FAP_REGLAS = {
  DIAS_CIERRE_INSCRIPCION: 7,
  CUPOS_MINIMOS_LLUAVES: 4,
} as const;
