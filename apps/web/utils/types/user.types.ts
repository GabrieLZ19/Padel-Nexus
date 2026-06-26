export type RolUsuario =
  | "usuario"
  | "admin"
  | "admin_provincial"
  | "admin_federacion"
  | "superadmin";

export interface Afiliacion {
  id: string;
  usuario_id: string;
  entidad: string;
  estado: string;
  fecha_vencimiento: string;
  created_at?: string;
}

export interface Licencia {
  id: string;
  created_at?: string;
  usuario_id: string;
  nro_licencia: string;
  estado: "Pendiente" | "Activa" | "Vencida" | "Suspendida";
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  datos_solicitud?: {
    documento: string;
    provincia: string;
    club_id: string;
  } | null;
  // Relación con Supabase
  perfiles?: Partial<Perfil> | null;
}

export interface Perfil {
  id: string;
  nombre: string | null;
  apellido: string | null;
  telefono: string | null;
  email: string | null;
  categoria_padel: string | null;
  lado_preferido: string | null;
  ranking_nacional: number;
  ranking_provincial: Record<string, number>;
  rol: RolUsuario;
  avatar_url: string | null;
  dni: string | null;
  lugar_residencia: string | null;
  created_at?: string;

  // Relaciones
  licencias?: Licencia[];
  afiliaciones?: Afiliacion[];
}

export interface LogAuditoria {
  id: string;
  usuario_id_admin: string;
  accion: string;
  entidad_afectada: string;
  detalles?: Record<string, unknown> | null;
  created_at?: string;
}
