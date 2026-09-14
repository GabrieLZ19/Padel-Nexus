export type ComunicacionesListaTipo = "manual" | "dinamica";

export type ComunicacionesEtiqueta = "marketing" | "institucional";

export type ComunicacionesAudienciaTipo =
  | "admins_asociaciones"
  | "admins_clubes"
  | "jugadores_provincia"
  | "jugadores_asociacion"
  | "jugadores_club"
  | "inscritos_torneo"
  | "lista"
  | "manual_ids"
  | "plataforma";

/**
 * Filtro por estado de licencia aplicable a audiencias de jugadores.
 * Debe mantenerse alineado con `apps/api/src/constants/comunicaciones.ts`.
 */
export type ComunicacionesLicenciaEstado = "vigente" | "sin_licencia";

export interface ComunicacionesFiltros {
  roles?: string[];
  provincias?: string[];
  asociacion_ids?: string[];
  club_ids?: string[];
  categorias?: string[];
  torneo_id?: string;
  solo_rol_usuario?: boolean;
  perfil_ids?: string[];
  licencia_estado?: ComunicacionesLicenciaEstado;
}

export interface ComunicacionesListaMiembro {
  perfil_id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface ComunicacionesLista {
  id: string;
  owner_id: string;
  nombre: string;
  tipo: ComunicacionesListaTipo;
  descripcion: string | null;
  etiquetas: ComunicacionesEtiqueta[];
  filtros: ComunicacionesFiltros;
  created_at: string;
  updated_at: string;
  miembros_count?: number | null;
  miembros?: ComunicacionesListaMiembro[];
}

export interface ComunicacionesContactoBusqueda {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  dni: string | null;
  rol: string | null;
  lugar_residencia: string | null;
  club_id: string | null;
  avatar_url: string | null;
}

export interface AudienciaSamplePerfil {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  rol: string | null;
}

export interface AudienciaPreview {
  total: number;
  sample: AudienciaSamplePerfil[];
}

export interface ComunicacionesCampana {
  id: string;
  creador_id: string;
  titulo: string;
  mensaje: string;
  lista_id: string | null;
  audiencia_tipo: ComunicacionesAudienciaTipo;
  filtros_usados: ComunicacionesFiltros;
  action_url: string | null;
  total_destinatarios: number;
  total_enviados: number;
  created_at: string;
  /**
   * Datos del remitente embebidos desde `perfiles` (join en backend).
   * Puede venir `null` en filas viejas o si el creador fue eliminado.
   */
  creador?: {
    id: string;
    nombre: string | null;
    apellido: string | null;
    email: string | null;
    rol: string | null;
  } | null;
}

export interface EnviarCampanaPayload {
  titulo: string;
  mensaje: string;
  audiencia_tipo: ComunicacionesAudienciaTipo;
  filtros?: ComunicacionesFiltros;
  lista_id?: string | null;
  action_url?: string | null;
}

export interface CrearListaPayload {
  nombre: string;
  tipo: ComunicacionesListaTipo;
  descripcion?: string | null;
  etiquetas?: ComunicacionesEtiqueta[];
  filtros?: ComunicacionesFiltros;
  miembro_ids?: string[];
}
