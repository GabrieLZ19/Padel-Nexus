export const MARKETPLACE_ESTADOS_VENDEDOR = {
  ACTIVO: "activo",
  SUSPENDIDO: "suspendido",
} as const;

export const MARKETPLACE_ESTADOS_ORDEN = {
  PENDIENTE: "pendiente",
  PAGADA: "pagada",
  ENTREGADA: "entregada",
  CANCELADA: "cancelada",
} as const;

export const MARKETPLACE_TIPOS_PRODUCTO = {
  PRODUCTO: "producto",
  SERVICIO: "servicio",
} as const;

export const MARKETPLACE_TIPOS_VENDEDOR = {
  JUGADOR: "jugador",
  CLUB: "club",
  ENTRENADOR: "entrenador",
  TIENDA: "tienda",
} as const;

export const MARKETPLACE_STORAGE = {
  BUCKET: "marketplace",
  MAX_IMAGENES_POR_PRODUCTO: 5,
  MAX_ANCHO_PX: 800,
  THUMBNAIL_ANCHO_PX: 200,
  CALIDAD_WEBP: 80,
  CALIDAD_THUMBNAIL: 70,
  MAX_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB antes de compresión
} as const;
