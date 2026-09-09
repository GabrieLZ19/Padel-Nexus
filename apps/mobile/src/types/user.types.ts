export type RolUsuario =
  | "usuario"
  | "fiscal"
  | "admin"
  | "admin_club"
  | "admin_provincial"
  | "admin_federacion"
  | "superadmin";

export interface PreferenciasNotificacion {
  push: boolean;
  email: boolean;
  whatsapp: boolean;
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
  fecha_nacimiento?: string | null;
  sexo?: "masculino" | "femenino" | "otro" | null;
  club_id: string | null;
  preferencias_notificacion?: PreferenciasNotificacion | null;
  created_at?: string;
  es_menor?: boolean;
  cuenta_estado?: string | null;
  perfil_publico_habilitado?: boolean;
  marketing_opt_in?: boolean;
}

export interface PerfilPublico {
  id: string;
  nombre: string | null;
  apellido: string | null;
  avatar_url: string | null;
  categoria_padel: string | null;
  lado_preferido: string | null;
  lugar_residencia: string | null;
  sexo?: string | null;
  es_menor?: boolean;
  clubes?: { id?: string; nombre?: string | null } | null;
}

export interface AuthResponse {
  exito: boolean;
  mensaje: string;
  usuario: Perfil;
  token: string;
}

export interface RegistroPayload {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono: string;
  dni: string;
  lugar_residencia: string;
  fecha_nacimiento: string;
  sexo?: string;
  categoria_padel: string;
  lado_preferido: string;
  avatar_base64?: string;
  acepta_tyc: boolean;
  acepta_privacidad: boolean;
  responsable?: {
    nombre: string;
    apellido: string;
    dni: string;
    email: string;
    telefono: string;
    vinculo: string;
  };
}

export interface RegistroResponse {
  exito: boolean;
  mensaje: string;
  data?: {
    es_menor?: boolean;
    cuenta_estado?: string;
    parental?: {
      token: string;
      consent_url: string;
      expires_at: string;
    } | null;
  };
}
