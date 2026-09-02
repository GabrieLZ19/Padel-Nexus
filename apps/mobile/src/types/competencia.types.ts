import type { Torneo } from "@/src/types/torneo.types";

export interface PartidoTorneo {
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
  ganador?: string | null;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  estado_partido?: string | null;
  fecha_partido?: string | null;
  equipo_a_j1?: string | null;
  equipo_a_j2?: string | null;
  equipo_a_club?: string | null;
  equipo_a_letra_prioridad?: string | null;
  equipo_a_provincia?: string | null;
  equipo_a_denominacion?: string | null;
  equipo_b_j1?: string | null;
  equipo_b_j2?: string | null;
  equipo_b_club?: string | null;
  equipo_b_letra_prioridad?: string | null;
  equipo_b_provincia?: string | null;
  equipo_b_denominacion?: string | null;
}

export interface ZonaTorneo {
  id: string;
  nombre?: string | null;
  letra?: string | null;
  nombre_grupo?: string | null;
  posiciones?: Array<{
    inscripcion_id?: string;
    nombre?: string;
    pts?: number;
    pj?: number;
    pg?: number;
  }>;
  parejas?: Array<{
    inscripcion_id?: string;
    jugador1_nombre?: string | null;
    jugador2_nombre?: string | null;
  }>;
  grupo_parejas?: GrupoParejaZona[];
}

export type GrupoZonaTorneo = ZonaTorneo;

export interface GrupoParejaZona {
  id: string;
  seed?: number | null;
  inscripcion_id?: string | null;
  clubName?: string | null;
  cabezaDeSerie?: boolean;
  inscripciones?: {
    id?: string;
    usuario_id?: string | null;
    usuario2_id?: string | null;
    jugador1_nombre?: string | null;
    jugador2_nombre?: string | null;
    provincia?: string | null;
    denominacion_nacional?: string | null;
    letra_prioridad?: string | null;
  } | null;
}

export interface HistorialRankingItem {
  torneo_id?: string | null;
  puntos_nuevos?: number | null;
  puntos_anteriores?: number | null;
  created_at?: string | null;
}

export interface RankingPerfilJugador {
  id: string;
  usuario_id: string;
  puntos: number;
  categoria: string;
  rama?: string | null;
  pj?: number | null;
  pg?: number | null;
  tendencia?: number | null;
  alcance?: string | null;
  provincia_jurisdiccion?: string | null;
  perfiles?: {
    nombre_completo?: string | null;
    nombre?: string | null;
    apellido?: string | null;
    categoria_padel?: string | null;
    avatar_url?: string | null;
    lugar_residencia?: string | null;
    clubes?: { nombre?: string; provincia?: string } | null;
  } | null;
  historial_ranking?: HistorialRankingItem[] | null;
}

export interface CheckElegibilidad {
  code: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface ElegibilidadInscripcion {
  ok: boolean;
  torneo: {
    id: string;
    nivel?: string | null;
    rama?: string | null;
    requiere_carnet: boolean;
    requiere_afiliacion: boolean;
  };
  jugador1: {
    id: string;
    nombre: string;
    categoria_padel?: string | null;
  };
  jugador2: {
    id: string;
    nombre: string;
    email: string | null;
    categoria_padel: string | null;
  } | null;
  checks: CheckElegibilidad[];
  checks_j1: CheckElegibilidad[];
  checks_j2: CheckElegibilidad[];
}

export interface RankingJugador {
  id: string;
  usuario_id: string;
  puntos: number;
  posicion_actual?: number;
  categoria: string;
  rama: string;
  pj: number;
  pg: number;
  tendencia: number;
  alcance: string;
  provincia_jurisdiccion?: string | null;
  nombre?: string;
  apellido?: string;
  categoria_padel?: string;
  perfiles?: {
    nombre?: string | null;
    apellido?: string | null;
    avatar_url?: string | null;
    categoria_padel?: string | null;
    lugar_residencia?: string | null;
    clubes?: { nombre?: string; provincia?: string } | null;
  } | null;
}

export type { Torneo };
