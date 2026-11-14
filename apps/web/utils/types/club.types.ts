export interface LicenciaClubResumenListado {
  nro_licencia: string;
  estado: string;
  fecha_vencimiento?: string | null;
}

export interface Club {
  id: string;
  nombre: string;
  provincia: string;
  localidad: string;
  direccion?: string | null;
  codigo_postal?: string | null;
  telefono?: string | null;
  canchas: number;
  estado: string;
  latitud?: number | null;
  longitud?: number | null;
  cbu?: string | null;
  alias?: string | null;
  asociacion_id?: string | null;
  asociaciones?: {
    id: string;
    nombre: string;
    sigla?: string | null;
    provincia?: string | null;
  } | null;
  /** Plan sin comisiones: desbloquea transferencia y pago en club */
  suscripcion_sin_comisiones?: boolean;
  pago_transferencia_habilitado?: boolean;
  pago_efectivo_habilitado?: boolean;
  /** RES-3: anticipación mínima (h) para cancelar una reserva confirmada. */
  horas_antelacion_cancelacion_jugador?: number;
  created_at?: string;
  torneos_count?: number; // Virtual
  licencia_federativa?: LicenciaClubResumenListado | null;
  /** false: sede registrada (torneos), sin listado en /reservar */
  es_adherido?: boolean;
  creado_por_club_id?: string | null;
  creado_por_entidad_id?: string | null;
}

export function clubEtiquetaListado(
  club: Pick<Club, "nombre" | "provincia" | "es_adherido">,
): string {
  const base = `${club.nombre}${club.provincia ? ` (${club.provincia})` : ""}`;
  if (club.es_adherido === false) {
    return `${base} · Sede registrada`;
  }
  return base;
}

export function esClubSoloSede(
  club: Pick<Club, "es_adherido"> | null | undefined,
): boolean {
  return club?.es_adherido === false;
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
  direccion?: string | null;
  codigo_postal?: string | null;
  telefono?: string | null;
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
