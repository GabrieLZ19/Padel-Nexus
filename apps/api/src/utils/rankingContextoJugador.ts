import {
  normalizarRama,
  type RamaRanking,
} from "../constants/rankings";
import { categoriaRequeridaDelTorneo } from "./categoriaTorneo";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

export type AlcanceRankingPublico = "Club" | "Provincial" | "Nacional";

export interface RankingContextoJugador {
  id: string;
  torneoId: string;
  torneoNombre: string;
  scope: AlcanceRankingPublico;
  categoria: string;
  provincia: string | null;
  clubId: string | null;
  clubNombre: string | null;
  /** Rama del torneo (Damas / Caballeros) para preseleccionar el ranking público. */
  rama: RamaRanking | null;
  etiqueta: string;
  fechaReferencia: string;
}

export interface TorneoContextoMin {
  id: string;
  club_id?: string | null;
  nombre?: string | null;
  fecha?: string | null;
  fecha_fin?: string | null;
  alcance?: string | null;
  categoria?: string | null;
  nivel?: string | null;
  rama?: string | null;
  es_prueba?: boolean | null;
  asociaciones?: { provincia?: string | null } | null;
  clubes?:
    | { id?: string | null; nombre?: string | null; provincia?: string | null }
    | null;
}

/** Mapea el alcance del torneo a las pestañas del ranking público. */
export function scopePublicoDesdeTorneo(
  alcance?: string | null,
): AlcanceRankingPublico {
  const valor = String(alcance || "").trim().toLowerCase();
  if (valor === "local" || valor === "privado") {
    return "Club";
  }
  if (
    valor === "nacional" ||
    valor.includes("global") ||
    valor.includes("internacional")
  ) {
    return "Nacional";
  }
  return "Provincial";
}

export function provinciaDesdeTorneo(torneo: TorneoContextoMin): string | null {
  const desdeAsoc = provinciaCanonicaArgentina(
    torneo.asociaciones?.provincia,
  );
  if (desdeAsoc) return desdeAsoc;
  const desdeClub = provinciaCanonicaArgentina(torneo.clubes?.provincia);
  if (desdeClub) return desdeClub;
  return null;
}

export function clubDesdeTorneo(
  torneo: TorneoContextoMin,
): { clubId: string | null; clubNombre: string | null } {
  const clubId =
    String(torneo.club_id || torneo.clubes?.id || "").trim() || null;
  const clubNombre = String(torneo.clubes?.nombre || "").trim() || null;
  return { clubId, clubNombre };
}

export function fechaReferenciaTorneo(
  torneo: TorneoContextoMin,
  fallbackIso?: string | null,
): string {
  const candidatos = [
    torneo.fecha_fin,
    torneo.fecha,
    fallbackIso,
  ].filter(Boolean) as string[];
  if (candidatos.length === 0) {
    return new Date(0).toISOString();
  }
  const fechas = candidatos.map((iso) => new Date(iso).getTime());
  const max = Math.max(...fechas.filter((t) => Number.isFinite(t)));
  if (!Number.isFinite(max)) return new Date(0).toISOString();
  return new Date(max).toISOString();
}

export function contextoDesdeTorneo(
  torneo: TorneoContextoMin,
  fechaExtra?: string | null,
): RankingContextoJugador | null {
  const torneoId = String(torneo.id || "").trim();
  if (!torneoId) return null;

  const categoria = categoriaRequeridaDelTorneo(torneo);
  if (!categoria) return null;

  const scope = scopePublicoDesdeTorneo(torneo.alcance);
  const provincia =
    scope === "Provincial" || scope === "Club"
      ? provinciaDesdeTorneo(torneo)
      : null;
  const { clubId, clubNombre } = clubDesdeTorneo(torneo);
  const nombre = String(torneo.nombre || "Torneo").trim();
  const fechaReferencia = fechaReferenciaTorneo(torneo, fechaExtra);

  return {
    id: torneoId,
    torneoId,
    torneoNombre: nombre,
    scope,
    categoria,
    provincia,
    clubId,
    clubNombre,
    rama: normalizarRama(torneo.rama),
    etiqueta: `${nombre} · ${categoria}`,
    fechaReferencia,
  };
}

/** Une contextos por torneo y ordena por fecha de referencia descendente. */
export function fusionarContextosRanking(
  parciales: RankingContextoJugador[],
): RankingContextoJugador[] {
  const porTorneo = new Map<string, RankingContextoJugador>();
  for (const ctx of parciales) {
    const prev = porTorneo.get(ctx.torneoId);
    if (!prev) {
      porTorneo.set(ctx.torneoId, ctx);
      continue;
    }
    const tPrev = new Date(prev.fechaReferencia).getTime();
    const tNew = new Date(ctx.fechaReferencia).getTime();
    if (tNew > tPrev) {
      porTorneo.set(ctx.torneoId, ctx);
    }
  }
  return [...porTorneo.values()].sort(
    (a, b) =>
      new Date(b.fechaReferencia).getTime() -
      new Date(a.fechaReferencia).getTime(),
  );
}