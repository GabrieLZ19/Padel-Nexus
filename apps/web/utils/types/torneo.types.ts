import { Club } from "./club.types";

export type EstadoTorneo =
  | "Borrador"
  | "Inscripción"
  | "En curso"
  | "Finalizado";
export type FormatoTorneo = "Eliminatoria Directa" | "Fase de Grupos" | "Mixto";

export interface Torneo {
  id: string;
  created_at?: string;
  nombre: string;
  subtitulo?: string | null;
  club_id?: string | null;
  fecha?: string | null;
  estado: EstadoTorneo;
  cupos_maximos: number;
  cupos_actuales: number;
  nivel?: string | null;
  categoria?: string | null;
  modalidad: string;
  precio_inscripcion: number;
  formato: string;
  formato_torneo: FormatoTorneo;
  premio_1?: string | null;
  premio_2?: string | null;
  premio_3?: string | null;

  // Relaciones
  clubes?: Partial<Club> | null;
  inscripciones?: Inscripcion[];
}

export interface Inscripcion {
  id: string;
  created_at?: string;
  torneo_id: string;
  usuario_id: string;
  usuario2_id?: string | null;
  jugador1_nombre?: string | null;
  jugador2_nombre?: string | null;
  monto: number;
  estado_pago: "Pendiente" | "Confirmado" | "Rechazado";
  tipo: string;
  letra_prioridad?: string | null;
  torneo_nombre?: string;
  cancha_nombre?: string;
  categoria?: string;
}

export interface Partido {
  id: string;
  torneo_id?: string;
  ronda: string;
  orden: number;
  set1_a?: number | null;
  set1_b?: number | null;
  ganador?: string | null; // UUID de la inscripción ganadora
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  estado_partido?: string;
  fecha_partido?: string | null;
  actualizado_por?: string | null;

  // Datos temporales / desnormalizados para el frontend (MatchCard)
  equipo_a_j1?: string | null;
  equipo_a_j2?: string | null;
  equipo_b_j1?: string | null;
  equipo_b_j2?: string | null;
}

export interface Cuadro {
  id: string;
  torneo_id: string;
  fase: string;
  configuracion?: Record<string, unknown> | null;
}

// Formularios de UI
export interface FormTorneoState {
  nombre: string;
  subtitulo?: string | null;
  club_id: string | null;
  fecha: string;
  estado: string;
  cupos_maximos?: number;
  cupos_actuales?: number;
  nivel: string;
  categoria: string;
  modalidad: string;
  precio_inscripcion?: number;
  formato: string;
  premio_1?: string;
  premio_2?: string;
  premio_3?: string;
  premios?: {
    uno?: string;
    dos?: string;
    tres?: string;
  };
}
