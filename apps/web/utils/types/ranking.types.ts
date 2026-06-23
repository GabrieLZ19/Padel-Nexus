import { Perfil } from "./user.types";

export interface RankingJugador {
  id: string;
  created_at?: string;
  usuario_id: string;
  puntos: number;
  posicion_actual?: number;
  categoria: string;
  rama: string;
  actualizado_hace?: string;
  pj: number;
  pg: number;
  tendencia: number;
  alcance: "Provincial" | "Nacional" | "Global";
  provincia_jurisdiccion?: string | null;

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
}
