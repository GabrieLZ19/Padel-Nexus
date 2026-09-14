/**
 * @deprecated Este archivo existe solo por retro-compatibilidad con imports
 * legacy (`@/utils/services/ranking`). Todo nuevo consumidor debe importar
 * desde `@/utils/services/rankings` (plural), donde vive la implementacion
 * consolidada.
 */

export {
  RankingsService,
  type RankingsQueryParams,
  type JugadorRanking,
  type TipoRankingFront,
  type RamaRankingFront,
  type AlcanceRanking,
} from "./rankings";
