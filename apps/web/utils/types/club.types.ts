export interface Club {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  direccion?: string;
  canchas: number;
  estado: string;
  latitud?: number | null;
  longitud?: number | null;
  cbu?: string | null;
  alias?: string | null;
  /** Plan sin comisiones: desbloquea transferencia y pago en club */
  suscripcion_sin_comisiones?: boolean;
  pago_transferencia_habilitado?: boolean;
  pago_efectivo_habilitado?: boolean;
  created_at?: string;
  torneos_count?: number; // Virtual
}

export interface ClubCercano extends Club {
  distancia_km?: number | null;
}

export interface Cancha {
  id: string;
  club_id: string;
  nombre: string;
  tipo_suelo?: string | null;
  techada: boolean;
  activa: boolean;
  created_at?: string;
  turnos?: Turno[];
}

export interface TurnoPlantillaSlot {
  hora_inicio: string;
  hora_fin: string;
  precio: number;
}

export interface TurnoPlantillaMasivaPayload {
  cancha_ids: string[];
  dias: number[];
  slots: TurnoPlantillaSlot[];
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
  latitud?: number | null;
  longitud?: number | null;
  cbu?: string | null;
  alias?: string | null;
  suscripcion_sin_comisiones?: boolean;
  pago_transferencia_habilitado?: boolean;
  pago_efectivo_habilitado?: boolean;
}

export interface SlotDisponible {
  turno_id: string;
  cancha_id: string;
  cancha_nombre: string;
  tipo_suelo: string | null;
  techada: boolean;
  hora_inicio: string;
  hora_fin: string;
  precio: number;
  disponible: boolean;
  motivo_bloqueo?: string | null;
}

export type BloqueoTipo = "mantenimiento" | "torneo" | "abono" | "otro";

export interface BloqueoDisponibilidad {
  id: string;
  club_id: string;
  cancha_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  tipo: BloqueoTipo;
  activo: boolean;
  created_by?: string | null;
  created_at?: string;
  canchas?: { nombre: string } | null;
}

export interface CrearBloqueoPayload {
  cancha_id?: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string | null;
  tipo?: BloqueoTipo;
}
