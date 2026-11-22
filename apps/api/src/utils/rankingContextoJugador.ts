import { categoriaRequeridaDelTorneo } from "./categoriaTorneo";
import { provinciaCanonicaArgentina } from "./provinciaRanking";

export type AlcanceRankingPublico = "Provincial" | "Nacional" | "Global";

export interface RankingContextoJugador {
  id: string;
  torneoId: string;
  torneoNombre: string;
  scope: AlcanceRankingPublico;
  categoria: string;
  provincia: string | null;
  etiqueta: string;
  fechaReferencia: string;
}

export interface TorneoContextoMin {
  id: string;
  nombre?: string | null;
  fecha?: string | null;
  fecha_fin?: string | null;
  alcance?: string | null;
  categoria?: string | null;
  nivel?: string | null;
  es_prueba?: boolean | null;
  asociaciones?: { provincia?: string | null } | null;
  clubes?: { provincia?: string | null } | null;
}

/** Mapea el alcance del torneo a las pestañas del ranking público. */
export function scopePublicoDesdeTorneo(
  alcance?: string | null,
): AlcanceRankingPublico {
  const valor = String(alcance || "").trim().toLowerCase();
  if (valor.includes("global") || valor.includes("internacional")) {
    return "Global";
  }
  if (valor === "nacional") {
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
  const provincia = scope === "Provincial" ? provinciaDesdeTorneo(torneo) : null;
  const nombre = String(torneo.nombre || "Torneo").trim();
  const fechaReferencia = fechaReferenciaTorneo(torneo, fechaExtra);

  return {
    id: torneoId,
    torneoId,
    torneoNombre: nombre,
    scope,
    categoria,
    provincia,
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