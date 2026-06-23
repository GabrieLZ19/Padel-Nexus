export interface Club {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado: string;
  created_at?: string;
  torneos_count?: number; // Virtual
}

export interface Cancha {
  id: string;
  club_id: string;
  nombre: string;
  tipo_suelo?: string | null;
  techada: boolean;
  activa: boolean;
  created_at?: string;
}

export interface Turno {
  id: string;
  cancha_id: string;
  hora_inicio: string; // Time
  hora_fin: string; // Time
  precio: number;
  dia_semana: number;
}

export interface Reserva {
  id: string;
  turno_id: string;
  usuario_id: string;
  fecha_reserva: string; // Date
  estado_pago: "pendiente" | "completado" | "rechazado";
  estado_reserva: "confirmada" | "cancelada";
  created_at?: string;
}

export interface FormClubState {
  nombre: string;
  provincia: string;
  localidad: string;
  canchas: number;
  estado: string;
}
