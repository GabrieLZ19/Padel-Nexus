export type RolUsuario =
  | "usuario"
  | "fiscal"
  | "admin"
  | "admin_club"
  | "admin_provincial"
  | "admin_federacion"
  | "superadmin";

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
  created_at?: string;
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
  fecha_nacimiento?: string;
  sexo?: string;
  categoria_padel: string;
  lado_preferido: string;
  avatar_base64?: string;
}
