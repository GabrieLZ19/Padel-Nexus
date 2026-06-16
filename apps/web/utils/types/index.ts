export interface Club {
  id: string; // En la DB es uuid
  nombre: string;
  provincia?: string | null;
  localidad?: string | null;
  canchas: number;
  estado?: string | null;
  created_at?: string | null;
  torneos_count?: number;
}

export interface FormClubState {
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado: string;
}

export interface Torneo {
  id: string;
  created_at?: string | null;
  nombre: string;
  subtitulo?: string | null;
  club_id?: string | null;
  fecha?: string | null;
  estado?: string | null;
  cupos_maximos?: number | null;
  cupos_actuales?: number | null;
  nivel?: string | null;
  categoria?: string | null;
  modalidad?: string | null;
  precio_inscripcion?: number | null;
  formato?: string | null;
  premio_1?: string | null;
  premio_2?: string | null;
  premio_3?: string | null;
  formato_torneo?: string | null;
  clubes?: Club | null;
}

export interface FormTorneoState {
  nombre: string;
  subtitulo?: string | null;
  club_id: string;
  nivel: string;
  categoria: string;
  estado: string;
  fecha: string;
  cupos_actuales?: number;
  cupos_maximos?: number;
  modalidad?: string;
  precio_inscripcion?: number;
  formato?: string;
  premio_1?: string;
  premio_2?: string;
  premio_3?: string;
}

export interface RankingJugador {
  id: string | number;
  usuario_id: string;
  puntos: number;
  posicion_actual: number;
  categoria: string;
  rama: string;
  actualizado_hace: string;
  pj?: number; // Partidos Jugados
  pg?: number; // Partidos Ganados
  club_nombre?: string; // Nombre del club al que representa
  tendencia?: number; // Variación de puestos (+3, -1, 0)
  perfiles?: {
    nombre_completo: string;
    avatar_url: string | null;
  } | null;
}

export interface Equipo {
  id: string;
  jugador1: string;
  jugador2: string;
}

export interface Partido {
  id: string;
  torneo_id?: string;
  ronda: string;
  orden: number;
  equipo_a_j1: string | null;
  equipo_a_j2: string | null;
  equipo_b_j1: string | null;
  equipo_b_j2: string | null;
  set1_a: number | null;
  set1_b: number | null;
  ganador: "A" | "B" | null;
}

export interface Licencia {
  id: string | number;
  created_at: string;
  usuario_id: string;
  nro_licencia: string;
  estado: "Pendiente" | "Activa" | "Vencida" | "Suspendida";
  fecha_emision?: string | null;
  fecha_vencimiento?: string | null;
  perfiles?: {
    nombre_completo: string;
    email: string;
  } | null;
}

export interface JugadorLicencia {
  id: string;
  nombre: string;
  email: string;
  categoria: string;
  club: string;
  estado_licencia: "Vigente" | "Por validar" | "Vencida";
  vencimiento: string | null;
}

export interface Inscripcion {
  id: string | number;
  created_at: string;
  jugador1_nombre: string;
  jugador2_nombre: string;
  torneo_nombre: string;
  categoria: string;
  monto: number;
  estado_pago: "Pendiente" | "Confirmado" | "Rechazado";
  tipo?: string;
  cancha_nombre?: string;
}

export interface Reserva {
  id: string | number;
  cancha_id: string | number;
  fecha: string; // ISO date
  hora_inicio: string; // formato HH:MM
  duracion: number; // minutos
  usuario_id?: string | number;
  estado?: "Activa" | "Cancelada" | "Completada";
  created_at?: string;
}

export interface Perfil {
  id: string;
  nombre_completo: string | null;
  telefono: string | null;
  categoria_padel: string | null;
  lado_preferido: string | null;
  rol: string;
  avatar_url: string | null;
  licencias?: {
    estado: string;
    nro_licencia: string;
    fecha_vencimiento: string;
  }[];
}
