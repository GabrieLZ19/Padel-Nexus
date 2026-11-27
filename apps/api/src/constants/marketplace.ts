export const MARKETPLACE_ESTADOS_VENDEDOR = {
  ACTIVO: "activo",
  SUSPENDIDO: "suspendido",
} as const;

/** Mensaje base cuando la tienda está suspendida y no admite ventas. */
export const MARKETPLACE_MENSAJE_TIENDA_SUSPENDIDA_VENTA =
  "La tienda no está disponible para nuevas compras.";

export const MARKETPLACE_ESTADOS_ORDEN = {
  PENDIENTE: "pendiente",
  PAGADA: "pagada",
  ENTREGADA: "entregada",
  CANCELADA: "cancelada",
} as const;

/** Plazo para pagar una orden pendiente (alineado a reservas MP). */
export const MARKETPLACE_ORDEN_PENDIENTE_MINUTOS = 15;

export function marketplaceOrdenEstadoCobrado(estado?: string | null): boolean {
  const e = (estado || "").toLowerCase();
  return (
    e === MARKETPLACE_ESTADOS_ORDEN.PAGADA ||
    e === MARKETPLACE_ESTADOS_ORDEN.ENTREGADA
  );
}

export const MARKETPLACE_TIPOS_PRODUCTO = {
  PRODUCTO: "producto",
  SERVICIO: "servicio",
} as const;

/** Tipos de entidad que pueden operar tienda en el marketplace. */
export const MARKETPLACE_ENTIDAD_TIPOS = {
  CLUB: "club",
  ASOCIACION: "asociacion",
  FEDERACION: "federacion",
} as const;

export type EntidadMarketplaceTipo =
  (typeof MARKETPLACE_ENTIDAD_TIPOS)[keyof typeof MARKETPLACE_ENTIDAD_TIPOS];

/** Alias legacy: tipo de vendedor = tipo de entidad. */
export const MARKETPLACE_TIPOS_VENDEDOR = MARKETPLACE_ENTIDAD_TIPOS;

export const MARKETPLACE_AUDIENCIAS_PROMOCION = {
  AFILIADOS: "afiliados",
  PLATAFORMA: "plataforma",
  COMPRADORES_PREVIOS: "compradores_previos",
} as const;

export type AudienciaPromocion =
  (typeof MARKETPLACE_AUDIENCIAS_PROMOCION)[keyof typeof MARKETPLACE_AUDIENCIAS_PROMOCION];

/** PUB-5: broadcast masivo solo para tienda de federación (como comunicaciones). */
export function puedeAudienciaPromocionPlataforma(
  entidadTipo: EntidadMarketplaceTipo,
): boolean {
  return entidadTipo === MARKETPLACE_ENTIDAD_TIPOS.FEDERACION;
}

export const MARKETPLACE_STORAGE = {
  BUCKET: "marketplace",
  MAX_IMAGENES_POR_PRODUCTO: 5,
  MAX_ANCHO_PX: 800,
  THUMBNAIL_ANCHO_PX: 200,
  CALIDAD_WEBP: 80,
  CALIDAD_THUMBNAIL: 70,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB antes de compresión
} as const;
