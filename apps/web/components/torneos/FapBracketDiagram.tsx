"use client";

import React, { useMemo, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { Partido } from "@/utils/types";
import { MatchCard } from "./MatchCard";
import { PairDisplay, esAlcanceNacional } from "@/components/torneos/PairDisplay";
import { PlayerAvatar } from "@/components/torneos/MatchTeamBox";

export type FapMatrixMatch = {
  matchNo: number;
  a: string;
  b: string;
  winnerTo: number | null;
};

type Props = {
  matches: FapMatrixMatch[];
  partidos: Partido[];
  pairCount?: number;
  alcance?: string | null;
  cabezasSerieIds?: Set<string>;
  interactive?: boolean;
  onMatchClick?: (partido: Partido) => void;
};

const SLOT = 220;
const CARD_W = 300;
const COL_GAP = 28;
const JOIN_GUTTER = 44;
const LEAF_W = 172;
const PAD_Y = 36;
const PAD_X = 12;
const CARD_H = 200;
const PAD_RIGHT = 32;
/** Borde derecho del chip de zona (fuente de las líneas). */
const LEAF_RIGHT = PAD_X + LEAF_W;

function formatSeed(ref: string): string {
  const m = /^([123])([A-L])$/i.exec(ref.trim());
  if (!m) return ref.startsWith("W") ? `Gan. #${ref.slice(1)}` : ref;
  return `${m[1]}º ${m[2].toUpperCase()}`;
}

function collectLeaves(
  byNo: Map<number, FapMatrixMatch>,
  matchNo: number,
): string[] {
  const m = byNo.get(matchNo);
  if (!m) return [];
  const side = (ref: string): string[] =>
    ref.startsWith("W")
      ? collectLeaves(byNo, Number(ref.slice(1)))
      : [ref];
  return [...side(m.a), ...side(m.b)];
}

function depthOf(byNo: Map<number, FapMatrixMatch>, matchNo: number): number {
  const m = byNo.get(matchNo);
  if (!m) return 0;
  const side = (ref: string) =>
    ref.startsWith("W") ? depthOf(byNo, Number(ref.slice(1))) + 1 : 0;
  return Math.max(side(m.a), side(m.b));
}

const ZOOM_MIN = 0.35;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;

/**
 * Solo dibuja ENTRADAS a cada cruce (zona→join o ganador→join).
 * Así no se duplican líneas al pasar de semis a final.
 */
export function FapBracketDiagram({
  matches,
  partidos,
  pairCount,
  alcance,
  cabezasSerieIds,
  interactive = false,
  onMatchClick,
}: Props) {
  const [zoom, setZoom] = useState(1);

  const bumpZoom = useCallback((delta: number) => {
    setZoom((z) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)),
    );
  }, []);

  const layout = useMemo(() => {
    const byNo = new Map(matches.map((m) => [m.matchNo, m]));
    const final =
      matches.find((m) => m.winnerTo == null) || matches[matches.length - 1];
    if (!final) return null;

    const leaves = collectLeaves(byNo, final.matchNo);
    const leafIndex = new Map(leaves.map((l, i) => [l, i]));
    const maxDepth = depthOf(byNo, final.matchNo);
    const colStride = JOIN_GUTTER + CARD_W + COL_GAP;

    const leafY = (idx: number) => PAD_Y + idx * SLOT + SLOT / 2;
    // Siempre dejar gutter entre chip de zona y el join (depth 0 no puede
    // caer en LEAF_RIGHT: si no, las horizontales salen con largo 0).
    const joinX = (depth: number) =>
      PAD_X + LEAF_W + JOIN_GUTTER + depth * colStride;
    const cardX = (depth: number) => joinX(depth) + JOIN_GUTTER;

    const spanOf = (ref: string) => {
      if (!ref.startsWith("W")) {
        const y = leafY(leafIndex.get(ref) ?? 0);
        return { min: y, max: y, mid: y };
      }
      const child = byNo.get(Number(ref.slice(1)));
      if (!child) return { min: 0, max: 0, mid: 0 };
      const a = spanOf(child.a);
      const b = spanOf(child.b);
      const min = Math.min(a.min, b.min);
      const max = Math.max(a.max, b.max);
      return { min, max, mid: (min + max) / 2 };
    };

    const partidoByOrden = new Map(
      partidos
        .filter((p) => p.orden != null)
        .map((p) => [Number(p.orden), p]),
    );

    const resolveLeafSide = (leaf: string) => {
      for (const m of matches) {
        if (m.a === leaf || m.b === leaf) {
          const side = m.a === leaf ? ("a" as const) : ("b" as const);
          return {
            matchNo: m.matchNo,
            side,
            partido: partidoByOrden.get(m.matchNo),
          };
        }
      }
      return null;
    };

    const feeder = (ref: string) => {
      if (!ref.startsWith("W")) {
        return {
          x: LEAF_RIGHT,
          y: leafY(leafIndex.get(ref) ?? 0),
          fromMatch: false as const,
        };
      }
      const prevNo = Number(ref.slice(1));
      const prevDepth = depthOf(byNo, prevNo);
      return {
        x: cardX(prevDepth) + CARD_W,
        y: spanOf(ref).mid,
        fromMatch: true as const,
      };
    };

    const matchNodes = matches.map((m) => {
      const d = depthOf(byNo, m.matchNo);
      const aSpan = spanOf(m.a);
      const bSpan = spanOf(m.b);
      const mid = (aSpan.mid + bSpan.mid) / 2;
      return {
        ...m,
        depth: d,
        joinX: joinX(d),
        cardX: cardX(d),
        y: mid - CARD_H / 2,
        yTop: aSpan.mid,
        yBot: bSpan.mid,
        yMid: mid,
        feedA: feeder(m.a),
        feedB: feeder(m.b),
        partido: partidoByOrden.get(m.matchNo),
      };
    });

    return {
      leaves: leaves.map((leaf, idx) => ({
        leaf,
        seed: formatSeed(leaf),
        y: leafY(idx),
        resolved: resolveLeafSide(leaf),
      })),
      matchNodes,
      width: cardX(maxDepth) + CARD_W + PAD_RIGHT,
      height: PAD_Y * 2 + Math.max(leaves.length, 1) * SLOT,
    };
  }, [matches, partidos]);

  if (!layout || matches.length === 0) {
    return (
      <div className="text-center p-10 text-gray-500 text-sm border border-dashed border-white/10 rounded-2xl">
        Sin plantilla FAP para este cuadro.
      </div>
    );
  }

  const ink = "rgba(255,255,255,0.28)";
  const inkHi = "rgba(203,254,1,0.55)";
  const nacional = esAlcanceNacional(alcance);

  return (
    <div className="rounded-2xl border border-brand-input bg-brand-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-brand-input bg-brand-input/40">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-chartreuse">
            Plantilla FAP
          </span>
          {pairCount != null && (
            <span className="text-xs font-bold text-gray-400">
              {pairCount} parejas · orden oficial
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 hidden sm:inline mr-1">
            Zoom
          </span>
          <button
            type="button"
            onClick={() => bumpZoom(-ZOOM_STEP)}
            disabled={zoom <= ZOOM_MIN}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-input bg-brand-input/50 text-gray-300 hover:text-brand-chartreuse hover:border-brand-chartreuse/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Alejar"
            title="Alejar"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            className="min-w-[3.25rem] h-8 rounded-lg border border-brand-input bg-brand-input/50 px-2 text-[11px] font-black tabular-nums text-brand-chartreuse hover:border-brand-chartreuse/40 transition-colors"
            aria-label="Restablecer zoom"
            title="Restablecer (100%)"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => bumpZoom(ZOOM_STEP)}
            disabled={zoom >= ZOOM_MAX}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-input bg-brand-input/50 text-gray-300 hover:text-brand-chartreuse hover:border-brand-chartreuse/40 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            aria-label="Acercar"
            title="Acercar"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(0.5)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-input bg-brand-input/50 text-gray-300 hover:text-brand-chartreuse hover:border-brand-chartreuse/40 transition-colors"
            aria-label="Ver cuadro completo"
            title="Vista amplia (50%)"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        className="overflow-auto pb-2 max-h-[min(78vh,920px)]"
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          bumpZoom(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: layout.width * zoom,
            height: layout.height * zoom,
            minWidth: zoom < 1 ? undefined : "100%",
          }}
        >
          <div
            className="relative"
            style={{
              width: layout.width,
              height: layout.height,
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              backgroundImage:
                "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
              backgroundSize: "14px 14px",
            }}
          >
          <svg
            className="absolute inset-0 pointer-events-none z-[1]"
            width={layout.width}
            height={layout.height}
            aria-hidden
          >
            {layout.matchNodes.map((node) => {
              const stroke = node.partido?.ganador ? inkHi : ink;

              const drawFeed = (
                feed: { x: number; y: number; fromMatch: boolean },
                entryY: number,
                key: string,
              ) => {
                // Zona → join: horizontal directa (misma Y)
                if (!feed.fromMatch) {
                  return (
                    <line
                      key={key}
                      x1={feed.x}
                      y1={entryY}
                      x2={node.joinX}
                      y2={entryY}
                      stroke={stroke}
                      strokeWidth={2}
                      strokeLinecap="square"
                    />
                  );
                }
                // Partido previo → join: un solo camino con codo
                const ex = feed.x + Math.max(14, (node.joinX - feed.x) * 0.45);
                if (Math.abs(feed.y - entryY) < 1) {
                  return (
                    <line
                      key={key}
                      x1={feed.x}
                      y1={entryY}
                      x2={node.joinX}
                      y2={entryY}
                      stroke={stroke}
                      strokeWidth={2}
                      strokeLinecap="square"
                    />
                  );
                }
                return (
                  <g key={key}>
                    <line
                      x1={feed.x}
                      y1={feed.y}
                      x2={ex}
                      y2={feed.y}
                      stroke={stroke}
                      strokeWidth={2}
                      strokeLinecap="square"
                    />
                    <line
                      x1={ex}
                      y1={feed.y}
                      x2={ex}
                      y2={entryY}
                      stroke={stroke}
                      strokeWidth={2}
                      strokeLinecap="square"
                    />
                    <line
                      x1={ex}
                      y1={entryY}
                      x2={node.joinX}
                      y2={entryY}
                      stroke={stroke}
                      strokeWidth={2}
                      strokeLinecap="square"
                    />
                  </g>
                );
              };

              return (
                <g key={`line-${node.matchNo}`}>
                  {drawFeed(node.feedA, node.yTop, `${node.matchNo}-a`)}
                  {drawFeed(node.feedB, node.yBot, `${node.matchNo}-b`)}
                  <line
                    x1={node.joinX}
                    y1={node.yTop}
                    x2={node.joinX}
                    y2={node.yBot}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeLinecap="square"
                  />
                  <line
                    x1={node.joinX}
                    y1={node.yMid}
                    x2={node.cardX}
                    y2={node.yMid}
                    stroke={stroke}
                    strokeWidth={2}
                    strokeLinecap="square"
                  />
                </g>
              );
            })}
          </svg>

          {layout.matchNodes.map((node) => (
            <div
              key={`badge-${node.matchNo}`}
              className="absolute z-[3] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: node.joinX, top: node.yMid }}
            >
              <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-brand-chartreuse/40 bg-[#121212] px-1.5 py-0.5 text-[11px] font-black tabular-nums text-brand-chartreuse shadow-sm">
                {node.matchNo}
              </span>
            </div>
          ))}

          {layout.leaves.map((leaf) => {
            const p = leaf.resolved?.partido;
            const side = leaf.resolved?.side;
            const j1 = side === "a" ? p?.equipo_a_j1 : p?.equipo_b_j1;
            const j2 = side === "a" ? p?.equipo_a_j2 : p?.equipo_b_j2;
            const avatarJ1 =
              side === "a" ? p?.equipo_a_avatar_j1 : p?.equipo_b_avatar_j1;
            const avatarJ2 =
              side === "a" ? p?.equipo_a_avatar_j2 : p?.equipo_b_avatar_j2;
            const usuarioId =
              side === "a" ? p?.equipo_a_usuario_id : p?.equipo_b_usuario_id;
            const usuario2Id =
              side === "a" ? p?.equipo_a_usuario2_id : p?.equipo_b_usuario2_id;
            const denominacion =
              side === "a" ? p?.equipo_a_denominacion : p?.equipo_b_denominacion;
            const pairId = side === "a" ? p?.equipo_a_id : p?.equipo_b_id;
            const isCabeza =
              !!pairId && !!cabezasSerieIds?.has(String(pairId));

            return (
              <div
                key={leaf.leaf}
                className="absolute z-[2] box-border -translate-y-1/2 rounded-xl border border-brand-input bg-brand-card px-2.5 py-2 shadow-sm"
                style={{ left: PAD_X, top: leaf.y, width: LEAF_W }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-black text-brand-chartreuse">
                    {leaf.seed}
                  </span>
                  {isCabeza && (
                    <span className="text-[9px] font-bold text-amber-500 bg-amber-400/15 border border-amber-400/30 px-1 rounded">
                      #1
                    </span>
                  )}
                </div>
                {j1 || j2 ? (
                  <PairDisplay
                    j1={j1}
                    j2={j2}
                    avatarJ1={avatarJ1}
                    avatarJ2={avatarJ2}
                    usuarioId={usuarioId}
                    usuario2Id={usuario2Id}
                    denominacion={denominacion}
                    alcanceNacional={nacional}
                    compact
                    variant="stacked"
                  />
                ) : (
                  <div className="flex items-center gap-2 min-h-[2rem]">
                    <PlayerAvatar src={null} size="sm" />
                    <span className="text-[11px] text-gray-500 italic">
                      Por clasificar
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {layout.matchNodes.map((node) => {
            if (!node.partido) {
              return (
                <div
                  key={node.matchNo}
                  className="absolute z-[2] rounded-2xl border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-xs text-gray-500"
                  style={{
                    left: node.cardX,
                    top: node.y,
                    width: CARD_W,
                    minHeight: CARD_H,
                  }}
                >
                  Partido #{node.matchNo}
                </div>
              );
            }

            return (
              <div
                key={node.matchNo}
                className="absolute z-[2]"
                style={{ left: node.cardX, top: node.y, width: CARD_W }}
              >
                <MatchCard
                  partido={node.partido}
                  isInteractive={interactive}
                  alcance={alcance}
                  origenEquipoA={formatSeed(node.a)}
                  origenEquipoB={formatSeed(node.b)}
                  esCabezaSerieA={
                    !!node.partido.equipo_a_id &&
                    !!cabezasSerieIds?.has(String(node.partido.equipo_a_id))
                  }
                  esCabezaSerieB={
                    !!node.partido.equipo_b_id &&
                    !!cabezasSerieIds?.has(String(node.partido.equipo_b_id))
                  }
                  onEditSelect={onMatchClick}
                  isActive={
                    node.partido.ganador == null &&
                    node.partido.equipo_a_id != null &&
                    node.partido.equipo_b_id != null
                  }
                />
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
