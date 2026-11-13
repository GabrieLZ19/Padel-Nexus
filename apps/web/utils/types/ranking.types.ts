import { Perfil } from "./user.types";

export interface RankingJugador {
  id: string;
  created_at?: string;
  usuario_id: string;
  puntos: number;
  posicion_actual?: number;
  /** Importado por planilla; aún sin activar la app con su mail. */
  ranking_provisional?: boolean;
  categoria: string;
  rama: string;
  actualizado_hace?: string;
  pj: number;
  pg: number;
  tendencia: number;
  alcance: "Local" | "Provincial" | "Nacional" | "Global";
  provincia_jurisdiccion?: string | null;

  // Propiedades opcionales / mapeadas
  nombre?: string;
  apellido?: string;
  categoria_padel?: string;
  ranking_nacional?: number;
  sexo?: string;
  provincia?: string;

  // Propiedades Virtuales / Relaciones Supabase
  club_nombre?: string; // Suele venir de un JOIN
  perfiles?: Partial<Perfil> & {
    clubes?: { nombre: string; provincia: string } | null;
  };
}

export interface HistorialRanking {
  id: string;
  usuario_id: string;
  torneo_id?: string | null;
  puntos_anteriores: number;
  puntos_nuevos: number;
  created_at?: string;
  torneo_nombre?: string | null;
  torneo_nivel?: string | null;
  torneo_alcance?: string | null;
  ronda?: string | null;
}

/** Registro de ranking + historial, devuelto por GET /rankings/:usuario_id */
export interface RankingPerfilJugador {
  id: string;
  usuario_id: string;
  puntos: number;
  posicion_actual?: number | null;
  ranking_provisional?: boolean;
  categoria: string;
  rama?: string | null;
  pj?: number | null;
  pg?: number | null;
  tendencia?: number | null;
  alcance?: string | null;
  provincia_jurisdiccion?: string | null;
  perfiles?: {
    nombre?: string | null;
    apellido?: string | null;
    categoria_padel?: string | null;
    avatar_url?: string | null;
    lugar_residencia?: string | null;
    clubes?: { nombre?: string; provincia?: string } | null;
  } | null;
  historial_ranking?: HistorialRanking[];
}
