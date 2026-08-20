"use client";

import { useEffect, useRef, useState } from "react";
import { Partido } from "@/utils/types";
import {
  PairDisplay,
  esAlcanceNacional,
} from "@/components/torneos/PairDisplay";

const RONDAS_CONFIG = [
  { id: "32AVOS", label: "32avos" },
  { id: "16AVOS", label: "16avos" },
  { id: "OCTAVOS", label: "Octavos" },
  { id: "CUARTOS", label: "Cuartos" },
  { id: "SEMIS", label: "Semis" },
  { id: "FINAL", label: "Final" },
] as const;

const MIN_COL_W = 300;
const MIN_CARD_W = 240;
const CONNECTOR_GAP = 56;
const ROW_H = 128;
const HEADER_H = 36;

function BracketTeamRow({
  j1,
  j2,
  avatarJ1,
  avatarJ2,
  usuarioId,
  usuario2Id,
  denominacion,
  alcanceNacional,
  won,
  emptyLabel,
}: {
  j1?: string | null;
  j2?: string | null;
  avatarJ1?: string | null;
  avatarJ2?: string | null;
  usuarioId?: string | null;
  usuario2Id?: string | null;
  denominacion?: string | null;
  alcanceNacional?: boolean;
  won?: boolean;
  emptyLabel?: string;
}) {
  const empty = !j1 && !j2 && !denominacion;

  return (
    <div
      className={`flex items-center gap-2.5 min-h-[2.15rem] px-3 py-1.5 ${
        won ? "bg-brand-chartreuse/10" : ""
      }`}
    >
      {empty ? (
        <>
          <span className="size-7 rounded-full border border-dashed border-white/15 shrink-0" />
          <p className="text-xs sm:text-[13px] font-medium truncate leading-tight text-gray-600 italic">
            {emptyLabel || "—"}
          </p>
        </>
      ) : (
        <div className="min-w-0 flex-1">
          <PairDisplay
            j1={j1}
            j2={j2}
            avatarJ1={avatarJ1}
            avatarJ2={avatarJ2}
            usuarioId={usuarioId}
            usuario2Id={usuario2Id}
            denominacion={denominacion}
            alcanceNacional={alcanceNacional}
            won={won}
            compact
            showAvatars
            variant="stacked"
          />
        </div>
      )}
    </div>
  );
}

function BracketMatchCell({
  partido,
  width,
  alcanceNacional,
}: {
  partido: Partido;
  width: number;
  alcanceNacional?: boolean;
}) {
  const isA =
    partido.ganador === partido.equipo_a_id && partido.ganador != null;
  const isB =
    partido.ganador === partido.equipo_b_id && partido.ganador != null;
  const finalizado = partido.ganador != null;
  const hasA = Boolean(
    partido.equipo_a_j1 || partido.equipo_a_j2 || partido.equipo_a_denominacion,
  );
  const hasB = Boolean(
    partido.equipo_b_j1 || partido.equipo_b_j2 || partido.equipo_b_denominacion,
  );
  const scoreA = [partido.set1_a, partido.set2_a, partido.set3_a]
    .filter((v) => v != null)
    .join("-");
  const scoreB = [partido.set1_b, partido.set2_b, partido.set3_b]
    .filter((v) => v != null)
    .join("-");

  return (
    <div
      className={`rounded-xl border overflow-hidden bg-[#121212] shadow-[0_1px_0_rgba(255,255,255,0.04)] ${
        finalizado ? "border-white/14" : "border-white/10"
      }`}
      style={{ width }}
    >
      <div className="flex items-stretch border-b border-white/6">
        <div className="min-w-0 flex-1">
          <BracketTeamRow
            j1={partido.equipo_a_j1}
            j2={partido.equipo_a_j2}
            avatarJ1={partido.equipo_a_avatar_j1}
            avatarJ2={partido.equipo_a_avatar_j2}
            usuarioId={partido.equipo_a_usuario_id}
            usuario2Id={partido.equipo_a_usuario2_id}
            denominacion={partido.equipo_a_denominacion}
            alcanceNacional={alcanceNacional}
            won={isA}
            emptyLabel={hasB && !hasA ? "BYE" : "TBD"}
          />
        </div>
        <div
          className={`w-9 shrink-0 flex items-center justify-center border-l border-white/6 text-[11px] font-black tabular-nums ${
            isA
              ? "text-brand-chartreuse bg-brand-chartreuse/10"
              : "text-gray-500"
          }`}
        >
          {scoreA || "–"}
        </div>
      </div>
      <div className="flex items-stretch">
        <div className="min-w-0 flex-1">
          <BracketTeamRow
            j1={partido.equipo_b_j1}
            j2={partido.equipo_b_j2}
            avatarJ1={partido.equipo_b_avatar_j1}
            avatarJ2={partido.equipo_b_avatar_j2}
            usuarioId={partido.equipo_b_usuario_id}
            usuario2Id={partido.equipo_b_usuario2_id}
            denominacion={partido.equipo_b_denominacion}
            alcanceNacional={alcanceNacional}
            won={isB}
            emptyLabel={hasA && !hasB ? "BYE" : "TBD"}
          />
        </div>
        <div
          className={`w-9 shrink-0 flex items-center justify-center border-l border-white/6 text-[11px] font-black tabular-nums ${
            isB
              ? "text-brand-chartreuse bg-brand-chartreuse/10"
              : "text-gray-500"
          }`}
        >
          {scoreB || "–"}
        </div>
      </div>
    </div>
  );
}

function getRoundMatches(
  partidos: Partido[],
  round: string,
  requiredCount: number,
  torneoId: string,
): Partido[] {
  const found = partidos
    .filter((p) => (p.ronda || "").toUpperCase() === round)
    .sort((a, b) => a.orden - b.orden);
  const result: Partido[] = [];
  for (let i = 0; i < requiredCount; i++) {
    if (found[i]) {
      result.push(found[i]);
    } else {
      result.push({
        id: `empty-${round}-${i}`,
        torneo_id: torneoId,
        ronda: round,
        orden: i + 1,
        equipo_a_j1: null,
        equipo_a_j2: null,
        equipo_b_j1: null,
        equipo_b_j2: null,
        set1_a: null,
        set1_b: null,
        ganador: null,
      });
    }
  }
  return result;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return Math.max(1, p);
}

export default function PublicBracketView({
  partidos,
  torneoId,
  isLive = false,
  isFinished = false,
  alcance,
}: {
  partidos: Partido[];
  torneoId: string;
  isLive?: boolean;
  isFinished?: boolean;
  alcance?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportW, setViewportW] = useState(0);
  const nacional = esAlcanceNacional(alcance);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setViewportW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const knockout = (partidos || []).filter((p) => {
    const r = (p.ronda || "").toUpperCase();
    return RONDAS_CONFIG.some((cfg) => cfg.id === r);
  });

  const activeRounds = RONDAS_CONFIG.filter((r) =>
    knockout.some((p) => (p.ronda || "").toUpperCase() === r.id),
  );

  if (activeRounds.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] px-6 py-16 text-center">
        <p className="text-sm text-gray-500">
          El cuadro aún no está disponible.
        </p>
      </div>
    );
  }

  const firstRoundId = activeRounds[0].id;
  const firstFound = knockout.filter(
    (p) => (p.ronda || "").toUpperCase() === firstRoundId,
  ).length;
  let expected = nextPow2(Math.max(1, firstFound));

  const roundsData = activeRounds.map((r) => {
    const matches = getRoundMatches(partidos, r.id, expected, torneoId);
    const data = { ...r, matches };
    expected = Math.max(1, Math.floor(expected / 2));
    return data;
  });

  const roundCount = roundsData.length;
  const minTotalW = roundCount * MIN_COL_W;
  const totalW = Math.max(minTotalW, viewportW || minTotalW);
  const colW = totalW / roundCount;
  const cardW = Math.min(
    Math.max(MIN_CARD_W, colW - CONNECTOR_GAP),
    colW - 40,
  );

  const firstCount = roundsData[0]?.matches.length || 1;
  const columnHeight = Math.max(360, firstCount * ROW_H);
  const totalH = columnHeight + HEADER_H;

  const matchCenters = (matchCount: number) => {
    const slot = columnHeight / matchCount;
    return Array.from(
      { length: matchCount },
      (_, i) => HEADER_H + i * slot + slot / 2,
    );
  };

  const connectorPaths: string[] = [];
  for (let r = 0; r < roundsData.length - 1; r++) {
    const curr = roundsData[r];
    const next = roundsData[r + 1];
    const cCenters = matchCenters(curr.matches.length);
    const nCenters = matchCenters(next.matches.length);
    const x0 = r * colW + cardW;
    const x1 = r * colW + colW - 8;
    const x2 = (r + 1) * colW;

    for (let i = 0; i < next.matches.length; i++) {
      const a = cCenters[i * 2];
      const b = cCenters[i * 2 + 1];
      const mid = nCenters[i];
      if (a == null || b == null || mid == null) continue;
      connectorPaths.push(
        `M ${x0} ${a} H ${x1} V ${b} H ${x0} M ${x1} ${mid} H ${x2}`,
      );
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#0c0c0c] overflow-hidden w-full">
      <div className="flex items-center justify-between gap-3 px-5 lg:px-8 py-4 border-b border-white/6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Cuadro principal
          </h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Eliminatoria · deslizá para ver todas las rondas
          </p>
        </div>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/25 text-red-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
            En vivo
          </span>
        ) : null}
        {isFinished ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400 text-[10px] font-bold uppercase tracking-wider">
            Finalizado
          </span>
        ) : null}
      </div>

      <div ref={scrollRef} className="overflow-x-auto px-4 py-8 lg:px-8 lg:py-10">
        <div
          className="relative"
          style={{ width: totalW, height: totalH, minWidth: "100%" }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            width={totalW}
            height={totalH}
            aria-hidden
          >
            {connectorPaths.map((d, i) => (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth={1.5}
              />
            ))}
          </svg>

          {roundsData.map((round, roundIdx) => {
            const centers = matchCenters(round.matches.length);

            return (
              <div
                key={round.id}
                className="absolute top-0"
                style={{ left: roundIdx * colW, width: colW }}
              >
                <p
                  className="flex items-center text-[10px] font-black uppercase tracking-[0.18em] text-brand-chartreuse/90"
                  style={{ height: HEADER_H }}
                >
                  {round.label}
                </p>
                <div className="relative" style={{ height: columnHeight }}>
                  {round.matches.map((match, matchIdx) => (
                    <div
                      key={match.id}
                      className="absolute left-0 -translate-y-1/2"
                      style={{ top: (centers[matchIdx] ?? 0) - HEADER_H }}
                    >
                      <BracketMatchCell
                        partido={match}
                        width={cardW}
                        alcanceNacional={nacional}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
