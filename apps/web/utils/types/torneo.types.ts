import { Club } from "./club.types";
import type { RamaPadel } from "../constants/fapApaRules";

export type EstadoTorneo =
  | "Borrador"
  | "Inscripción"
  | "Cerrado"
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
  rama?: RamaPadel | string | null;
  nivel?: string | null;
  categoria?: string | null;
  modalidad: string;
  precio_inscripcion: number;
  formato: string;
  premio_1?: string | null;
  premio_2?: string | null;
  premio_3?: string | null;
  lugar?: string | null;
  alcance?: 'Nacional' | 'Provincial' | 'Regional' | 'Local' | null;
  asociacion?: 'FAP' | 'APA' | 'Amateur' | null;
  canchas_disponibles?: number | null;
  duracion_partido_minutos?: number | null;
  hora_inicio_jornada?: string | null;
  banners?: string[];

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
  set2_a?: number | null;
  set2_b?: number | null;
  set3_a?: number | null;
  set3_b?: number | null;
  cancha_asignada?: string | null;
  es_wo?: boolean;
  es_supertiebreak?: boolean;
  es_injustificado_wo?: boolean;
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
  rama: string;
  nivel: string;
  categoria: string;
  modalidad: string;
  precio_inscripcion?: number;
  formato: string;
  alcance?: 'Nacional' | 'Provincial' | 'Regional' | 'Local' | null;
  asociacion?: 'FAP' | 'APA' | 'Amateur' | null;
  premio_1?: string;
  premio_2?: string;
  premio_3?: string;
  premios?: {
    uno?: string;
    dos?: string;
    tres?: string;
  };
  canchas_disponibles?: number;
  duracion_partido_minutos?: number;
  hora_inicio_jornada?: string;
}
