import { api } from "../api";
import { RankingJugador } from "../types";

/**
 * Tipos de ranking segun reglamento FAP.
 * Debe mantenerse alineado con `apps/api/src/constants/rankings.ts`.
 */
export type TipoRankingFront = "menores" | "veteranos" | "libres";

/** Rama del ranking (Damas / Caballeros). */
export type RamaRankingFront = "masculino" | "femenino";

/** Alcance del ranking (jurisdiccion). */
export type AlcanceRanking = "Provincial" | "Nacional" | "Global";

export interface RankingsQueryParams {
  categoria?: string;
  provincia?: string;
  pais?: string;
  scope?: AlcanceRanking | string;
  /** Alias de `scope`, aceptado por compatibilidad. */
  alcance?: AlcanceRanking | string;
  rama?: RamaRankingFront | string;
  tipo_ranking?: TipoRankingFront;
  limit?: number;
}

/**
 * Vista enriquecida del ranking usada en tablas del CRM.
 * Mapea propiedades embebidas de `perfiles` al nivel raiz para render simple.
 */
export type JugadorRanking = RankingJugador & {
  nombre?: string;
  apellido?: string;
  categoria_padel?: string;
  provincia?: string;
  sexo?: string;
  club?: string;
  dni?: string;
  avatar_url?: string | null;
};

interface RankingApiResponse {
  exito?: boolean;
  data?: unknown;
  error?: string;
}

/** Type guard: valor tratable como objeto para lecturas dinamicas. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Aplana `perfiles.*` sobre el nivel raiz preservando el objeto original. */
function normalizarJugador(raw: unknown, index: number): JugadorRanking {
  const jugador = isRecord(raw) ? raw : {};
  const perfil = isRecord(jugador.perfiles) ? jugador.perfiles : {};
  const clubes = isRecord(perfil.clubes) ? perfil.clubes : {};

  const nombre =
    (jugador.nombre as string | undefined) ||
    (perfil.nombre as string | undefined) ||
    "Jugador";
  const apellido =
    (jugador.apellido as string | undefined) ||
    (perfil.apellido as string | undefined) ||
    "";

  // Sanitizamos categoria "prueba" que se filtra desde torneos de test.
  let rawCat =
    (jugador.categoria_padel as string | undefined) ||
    (jugador.categoria as string | undefined) ||
    (perfil.categoria_padel as string | undefined);
  if (!rawCat || rawCat.toLowerCase() === "prueba") {
    rawCat = (perfil.categoria_padel as string | undefined) || "5ª";
  }

  const provincia =
    (jugador.provincia as string | undefined) ||
    (perfil.lugar_residencia as string | undefined) ||
    (clubes.provincia as string | undefined) ||
    "Argentina";

  const sexo =
    (jugador.sexo as string | undefined) ||
    (jugador.rama as string | undefined) ||
    (perfil.sexo as string | undefined) ||
    "Masculino";

  return {
    ...(jugador as Partial<JugadorRanking>),
    id: (jugador.id as string | undefined) || `rank-${index}`,
    nombre,
    apellido,
    dni:
      (jugador.dni as string | undefined) ||
      (perfil.dni as string | undefined) ||
      "N/D",
    avatar_url:
      (jugador.avatar_url as string | null | undefined) ??
      (perfil.avatar_url as string | null | undefined) ??
      null,
    club:
      (jugador.club as string | undefined) ||
      (clubes.nombre as string | undefined) ||
      "Club Afiliado",
    categoria_padel: rawCat,
    provincia,
    sexo,
    puntos:
      (jugador.puntos as number | undefined) ??
      (jugador.ranking_nacional as number | undefined) ??
      0,
  } as JugadorRanking;
}

/**
 * Servicio centralizado de rankings.
 *
 * Nota: `getAll` acepta filtros opcionales y devuelve una vista normalizada
 * lista para renderizar en tabla. Para consumo "crudo" (podio publico), usar
 * `getGlobal` que devuelve `RankingJugador[]` sin aplanar.
 */
export const RankingsService = {
  /**
   * Devuelve el ranking normalizado y listo para tabla. Si no se pasan
   * filtros, se obtiene el top provincial por defecto (comportamiento del CRM).
   */
  async getAll(params?: RankingsQueryParams): Promise<JugadorRanking[]> {
    try {
      const res = await api.get<RankingApiResponse>("/rankings", {
        params: params ?? {},
      });
      const rawItems = res.data?.data ?? res.data ?? [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      return items.map((jugador, index) => normalizarJugador(jugador, index));
    } catch (error) {
      console.warn("Error al cargar rankings desde la API:", error);
      return [];
    }
  },

  /**
   * Version cruda del ranking (sin aplanado de perfiles).
   * Usada por vistas publicas que ya consumen `perfiles.*` anidado.
   */
  async getGlobal(params?: RankingsQueryParams): Promise<RankingJugador[]> {
    const response = await api.get<RankingApiResponse>("/rankings", {
      params: params ?? {},
    });
    const data = response.data?.data;
    return Array.isArray(data) ? (data as RankingJugador[]) : [];
  },

  /** Ranking por provincias basado en resultados de un torneo nacional. */
  async getProvincialPorTorneo(torneoId: string): Promise<{
    torneoId: string;
    provincias: Array<{ provincia: string; puntos: number; parejas: number }>;
  }> {
    const res = await api.get<RankingApiResponse>(
      `/rankings/provincial/${torneoId}`,
    );
    const data = res.data?.data;
    if (isRecord(data) && Array.isArray((data as { provincias?: unknown }).provincias)) {
      return data as {
        torneoId: string;
        provincias: Array<{ provincia: string; puntos: number; parejas: number }>;
      };
    }
    return { torneoId, provincias: [] };
  },
};
