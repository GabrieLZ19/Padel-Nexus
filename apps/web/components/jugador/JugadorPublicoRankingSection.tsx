"use client";

import { TrendingDown, TrendingUp, Trophy, Swords, Medal } from "lucide-react";
import type { RankingPerfilJugador } from "@/utils/types";
import { etiquetaCategoria } from "@/utils/etiquetaCategoria";
import { textoRectora } from "@/utils/textosRectora";
import { useSiglaRectora } from "@/utils/useSiglaRectora";
import {
  ETIQUETA_PUNTOS_FICHA_PUBLICA,
  subtituloMovimientoHistorial,
  tituloMovimientoHistorial,
} from "@/utils/fichaPublicaJugador";

function labelAlcance(alcance?: string | null): string {
  switch (alcance) {
    case "Local":
      return "Ranking del club";
    case "Provincial":
      return "Ranking provincial";
    case "Nacional":
      return "Ranking nacional";
    case "Global":
      return "Ranking global";
    default:
      return alcance ? `Ranking ${alcance.toLowerCase()}` : "Ranking";
  }
}

function TrendPill({ tendencia }: { tendencia: number }) {
  if (tendencia > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
        <TrendingUp className="size-3.5" /> +{tendencia}
      </span>
    );
  }
  if (tendencia < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-400">
        <TrendingDown className="size-3.5" /> {Math.abs(tendencia)}
      </span>
    );
  }
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-500">
      Estable
    </span>
  );
}

export function elegirRegistroPrincipal(
  registros: RankingPerfilJugador[],
  scope?: string | null,
  categoria?: string | null,
): RankingPerfilJugador | null {
  if (registros.length === 0) return null;
  if (scope) {
    const porScope = registros.filter((r) => r.alcance === scope);
    if (categoria) {
      const exact = porScope.find((r) => r.categoria === categoria);
      if (exact) return exact;
    }
    if (porScope.length > 0) {
      return [...porScope].sort((a, b) => b.puntos - a.puntos)[0];
    }
  }
  if (categoria) {
    const match = registros.find((r) => r.categoria === categoria);
    if (match) return match;
  }
  return [...registros].sort((a, b) => b.puntos - a.puntos)[0];
}

export default function JugadorPublicoRankingSection({
  registros,
  principal,
  posicion,
  scope,
}: {
  registros: RankingPerfilJugador[];
  principal: RankingPerfilJugador | null;
  posicion?: string | null;
  scope?: string | null;
}) {
  const siglaRectora = useSiglaRectora();

  if (!principal) {
    return (
      <section className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6">
        <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-2">
          {textoRectora("ranking", siglaRectora)}
        </h2>
        <p className="text-sm text-gray-400">
          Todavía no acumuló puntos oficiales en este circuito. Los puntos
          aparecen al cerrar torneos federados.
        </p>
      </section>
    );
  }

  const pj = principal.pj ?? 0;
  const pg = principal.pg ?? 0;
  const winRate = pj > 0 ? Math.round((pg / pj) * 100) : 0;
  const tendencia = principal.tendencia ?? 0;
  const mostrarDesglose = registros.length > 1;
  const porAlcance = new Set(registros.map((r) => r.alcance).filter(Boolean))
    .size > 1;

  const historial = (principal.historial_ranking || [])
    .filter((h) => h.created_at)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-brand-chartreuse/25 bg-[radial-gradient(ellipse_at_top_left,rgba(203,254,1,0.12),transparent_60%)] p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1">
              {ETIQUETA_PUNTOS_FICHA_PUBLICA}
            </p>
            <p className="text-4xl md:text-5xl font-black text-brand-chartreuse tabular-nums">
              {principal.puntos.toLocaleString("es-AR")}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {labelAlcance(principal.alcance || scope)} · Categoría en ranking:{" "}
              <span className="text-gray-300 font-semibold">
                {etiquetaCategoria(principal.categoria)}
              </span>
            </p>
            {principal.ranking_provisional ? (
              <p className="text-xs text-amber-400/90 mt-2 max-w-sm">
                Ficha provisional (alta por planilla). Los puntos son oficiales;
                al registrarse en la app con su DNI consolidará la cuenta.
              </p>
            ) : null}
          </div>
          <TrendPill tendencia={tendencia} />
        </div>
      </section>

      <section>
        <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-4">
          Estadísticas
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              icon: <Medal className="size-4 text-brand-chartreuse" />,
              label: "Posición",
              value: posicion ? `#${posicion}` : "—",
              accent: true,
            },
            {
              icon: <Swords className="size-4 text-white/70" />,
              label: "Partidos",
              value: String(pj),
            },
            {
              icon: <Trophy className="size-4 text-white/70" />,
              label: "Ganados",
              value: String(pg),
            },
            {
              icon: <TrendingUp className="size-4 text-white/70" />,
              label: "Efectividad",
              value: `${winRate}%`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border p-4 ${
                stat.accent
                  ? "border-brand-chartreuse/30 bg-brand-chartreuse/5"
                  : "border-white/8 bg-white/[0.03]"
              }`}
            >
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                {stat.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-black text-white">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {mostrarDesglose ? (
        <section>
          <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-3">
            {porAlcance ? "Puntos por circuito" : "Puntos por categoría"}
          </h2>
          <ul className="divide-y divide-white/6 rounded-2xl border border-white/8 overflow-hidden">
            {registros.map((row) => (
              <li
                key={row.id}
                className="flex items-center justify-between gap-4 px-4 py-3.5 bg-white/[0.02]"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white text-sm truncate">
                    {porAlcance
                      ? row.alcance || "Circuito"
                      : etiquetaCategoria(row.categoria)}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {porAlcance
                      ? `${etiquetaCategoria(row.categoria)} · PJ ${row.pj ?? 0} · PG ${row.pg ?? 0}`
                      : `${labelAlcance(row.alcance)} · PJ ${row.pj ?? 0} · PG ${row.pg ?? 0}`}
                  </p>
                </div>
                <span className="font-black text-brand-chartreuse tabular-nums shrink-0">
                  {row.puntos.toLocaleString("es-AR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {historial.length > 0 ? (
        <section>
          <h2 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-3">
            Últimos movimientos de puntos
          </h2>
          <ul className="space-y-2">
            {historial.map((h, i) => {
              const delta =
                (h.puntos_nuevos ?? 0) - (h.puntos_anteriores ?? 0);
              return (
                <li
                  key={`${h.torneo_id || "mov"}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {tituloMovimientoHistorial(h)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {subtituloMovimientoHistorial(h)}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-bold tabular-nums shrink-0 ${
                      delta >= 0 ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {delta} pts
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
