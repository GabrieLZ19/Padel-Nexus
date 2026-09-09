import type { RolUsuario } from "./roles";

export const COMUNICACIONES_ROLES_PERMITIDOS: RolUsuario[] = [
  "superadmin",
  "admin_federacion",
  "admin_provincial",
  "admin",
  "admin_club",
];

export const COMUNICACIONES_AUDIENCIA_TIPOS = [
  "admins_asociaciones",
  "jugadores_provincia",
  "jugadores_asociacion",
  "jugadores_club",
  "inscritos_torneo",
  "lista",
  "manual_ids",
  "plataforma",
] as const;

export type ComunicacionesAudienciaTipo =
  (typeof COMUNICACIONES_AUDIENCIA_TIPOS)[number];

export const COMUNICACIONES_LISTA_TIPOS = ["manual", "dinamica"] as const;

export type ComunicacionesListaTipo =
  (typeof COMUNICACIONES_LISTA_TIPOS)[number];

export const COMUNICACIONES_ETIQUETAS = ["marketing", "institucional"] as const;

export type ComunicacionesEtiqueta = (typeof COMUNICACIONES_ETIQUETAS)[number];

export const COMUNICACIONES_DESTINATARIO_ESTADOS = [
  "enviado",
  "omitido_prefs",
  "error",
] as const;

export type ComunicacionesDestinatarioEstado =
  (typeof COMUNICACIONES_DESTINATARIO_ESTADOS)[number];

/** Cap suave MVP para evitar timeouts en el fan-out. */
export const COMUNICACIONES_MAX_DESTINATARIOS = 2000;

/** Tamaño de lote al crear notificaciones. */
export const COMUNICACIONES_BATCH_SIZE = 100;

export interface ComunicacionesFiltros {
  roles?: string[];
  provincias?: string[];
  asociacion_ids?: string[];
  club_ids?: string[];
  categorias?: string[];
  torneo_id?: string;
  solo_rol_usuario?: boolean;
  perfil_ids?: string[];
}

export function esAudienciaTipoValido(
  value: string | undefined | null,
): value is ComunicacionesAudienciaTipo {
  return Boolean(
    value &&
      (COMUNICACIONES_AUDIENCIA_TIPOS as readonly string[]).includes(value),
  );
}

export function normalizarEtiquetas(
  raw?: string[] | null,
): ComunicacionesEtiqueta[] {
  if (!raw?.length) return [];
  const allowed = new Set<string>(COMUNICACIONES_ETIQUETAS);
  return [
    ...new Set(
      raw.filter((e): e is ComunicacionesEtiqueta => allowed.has(e)),
    ),
  ];
}
