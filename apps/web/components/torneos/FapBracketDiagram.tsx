"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, X } from "lucide-react";
import type { Partido } from "@/utils/types";
import { MatchCard } from "./MatchCard";
import { PairDisplay, esAlcanceNacional } from "@/components/torneos/PairDisplay";
import { POR_DEFINIR } from "@/utils/etiquetaPareja";
import { textoRectora } from "@/utils/textosRectora";
import { useSiglaRectora } from "@/utils/useSiglaRectora";
import { PlayerAvatar } from "@/components/torneos/MatchTeamBox";
import {
  codigoRondaPorNumeroFap,
  columnasRondaLlave,
  etiquetaRondaLlave,
  numerosVisiblesLlave,
  vincularPartidosAMatriz,
} from "@/utils/rondasLlave";
import {
  MEDIDA_LLAVE,
  anchoColumnaLlave,
  anchoLienzoLlave,
  zoomAjustadoAlAncho,
} from "@/utils/medidaLlave";

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
  /** Vista pública / mobile: zoom inicial más bajo y tipografía compacta. */
  compact?: boolean;
  /** Primer número visible de la llave. Con 16 partidos de zona, es 17. */
  inicioNumeracion?: number;
};

const SLOT = 220;
const CARD_W = MEDIDA_LLAVE.cardW;
const JOIN_GUTTER = MEDIDA_LLAVE.joinGutter;
const PAD_Y = 36;
const HEADER_H = 36;
const PAD_X = MEDIDA_LLAVE.padX;
const CARD_H = 200;
const PAD_RIGHT = MEDIDA_LLAVE.padRight;

function formatSeed(ref: string, numeros: Map<number, number>): string {
  const raw = ref.trim();
  if (raw.startsWith("W")) {
    const matchNo = Number(raw.slice(1));
    return `Gan. #${numeros.get(matchNo) ?? matchNo}`;
  }
  const m = /^([123])([A-L])$/i.exec(raw);
  if (!m) return raw;
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

function entryMatchForLeaf(
  matches: FapMatrixMatch[],
  leaf: string,
): { matchNo: number; side: "a" | "b" } | null {
  for (const m of matches) {
    if (m.a === leaf) return { matchNo: m.matchNo, side: "a" };
    if (m.b === leaf) return { matchNo: m.matchNo, side: "b" };
  }
  return null;
}

const ZOOM_MIN = MEDIDA_LLAVE.zoomMin;
const ZOOM_MAX = MEDIDA_LLAVE.zoomMax;
const ZOOM_STEP = 0.1;

type Feed = { x: number; y: number };

/**
 * Plantilla FAP (matrices ELEMENTOS):
 * - Sin columna de chips “Por clasificar” (redundante: el MatchCard ya muestra 1º A / Gan. #N).
 * - Semillas que entran en ronda > 0 (pase directo) ocupan un **slot BYE** del mismo
 *   tamaño que un partido de apertura, para mantener la jerarquía visual del draw.
 * - Partidos de apertura: sin horquilla a la izquierda (no hay ronda previa).
 *
 * Reglamento: 2ª etapa = llave de simple eliminación con clasificados de zona;
 * la estructura de byes/pases la define la matriz oficial, no un label suelto.
 */
export function FapBracketDiagram({
  matches,
  partidos,
  pairCount,
  alcance,
  cabezasSerieIds,
  interactive = false,
  onMatchClick,
  compact = false,
  inicioNumeracion = 1,
}: Props) {
  const siglaRectora = useSiglaRectora();
  const plantilla = textoRectora("plantilla", siglaRectora);
  const scrollRef = useRef<HTMLDivElement>(null);
  const layoutWidthRef = useRef(0);
  const zoomTouchedRef = useRef(false);
  const [zoom, setZoom] = useState<number>(ZOOM_MIN);
  const [mobile, setMobile] = useState(compact);
  const [fullscreen, setFullscreen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches || compact);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [compact]);

  const bumpZoom = useCallback((delta: number) => {
    zoomTouchedRef.current = true;
    setZoom((z) =>
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round((z + delta) * 100) / 100)),
    );
  }, []);

  const setZoomManual = useCallback((next: number) => {
    zoomTouchedRef.current = true;
    setZoom(
      Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(next * 100) / 100)),
    );
  }, []);

  const fitWidth = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !layoutWidthRef.current) return;
    const available = el.clientWidth - 8;
    setZoom(zoomAjustadoAlAncho(layoutWidthRef.current, available));
  }, []);

  const fitWidthFromUser = useCallback(() => {
    zoomTouchedRef.current = true;
    fitWidth();
  }, [fitWidth]);

  const openFullscreen = useCallback(() => {
    setFullscreen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
  }, []);

  const layout = useMemo(() => {
    const byNo = new Map(matches.map((m) => [m.matchNo, m]));
    const final =
      matches.find((m) => m.winnerTo == null) || matches[matches.length - 1];
    if (!final) return null;

    const leaves = collectLeaves(byNo, final.matchNo);
    const leafIndex = new Map(leaves.map((l, i) => [l, i]));
    const colStride = anchoColumnaLlave();
    const columnas = columnasRondaLlave(matches.map((m) => m.matchNo));
    const numeros = numerosVisiblesLlave(
      matches.map((m) => m.matchNo),
      inicioNumeracion,
    );
    const colDe = (matchNo: number) => columnas.get(matchNo) ?? 0;
    const maxCol = Math.max(0, ...matches.map((m) => colDe(m.matchNo)));

    const leafY = (idx: number) => HEADER_H + PAD_Y + idx * SLOT + SLOT / 2;
    const cardX = (col: number) => PAD_X + col * colStride;
    const joinX = (col: number) => cardX(col) - JOIN_GUTTER;

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

    const partidoById = new Map(partidos.map((p) => [p.id, p]));
    const vinculo = vincularPartidosAMatriz(
      matches.map((m) => m.matchNo),
      partidos,
    );
    const partidoDe = (matchNo: number) => {
      const id = vinculo.get(matchNo);
      return id ? partidoById.get(id) : undefined;
    };

    // Semilla que entra después de la primera ronda: slot BYE en la columna anterior.
    const byeSlots = leaves
      .map((leaf) => {
        const entry = entryMatchForLeaf(matches, leaf);
        if (!entry) return null;
        const col = colDe(entry.matchNo);
        if (col <= 0) return null;
        const partido = partidoDe(entry.matchNo);
        const y = leafY(leafIndex.get(leaf) ?? 0);
        const byeCol = col - 1;
        return {
          leaf,
          seed: formatSeed(leaf, numeros),
          side: entry.side,
          targetMatchNo: entry.matchNo,
          targetNumero: numeros.get(entry.matchNo) ?? entry.matchNo,
          partido,
          cardX: cardX(byeCol),
          y: y - CARD_H / 2,
          midY: y,
          rightX: cardX(byeCol) + CARD_W,
        };
      })
      .filter((n): n is NonNullable<typeof n> => n != null);

    const byeByLeaf = new Map(byeSlots.map((b) => [b.leaf, b]));

    const feeder = (ref: string): Feed | null => {
      if (!ref.startsWith("W")) {
        const bye = byeByLeaf.get(ref);
        if (!bye) return null; // semilla de un partido de apertura: sin nodo previo
        return { x: bye.rightX, y: bye.midY };
      }
      const prevNo = Number(ref.slice(1));
      return {
        x: cardX(colDe(prevNo)) + CARD_W,
        y: spanOf(ref).mid,
      };
    };

    const matchNodes = matches.map((m) => {
      const col = colDe(m.matchNo);
      const aSpan = spanOf(m.a);
      const bSpan = spanOf(m.b);
      const mid = (aSpan.mid + bSpan.mid) / 2;
      const feedA = feeder(m.a);
      const feedB = feeder(m.b);
      const feeds = [feedA, feedB].filter((f): f is Feed => f != null);
      // Solo dibujar join si hay al menos un alimentador (partido previo o slot BYE).
      const showJoin = feeds.length > 0 && col > 0;
      const showFullJoin = feeds.length === 2;

      // Si un solo lado alimenta, la horquilla vertical se reduce a ese lado + mid.
      let yTop = aSpan.mid;
      let yBot = bSpan.mid;
      if (showJoin && !showFullJoin) {
        const only = feeds[0];
        yTop = Math.min(only.y, mid);
        yBot = Math.max(only.y, mid);
      }

      return {
        ...m,
        depth: col,
        numero: numeros.get(m.matchNo) ?? m.matchNo,
        etiqueta: etiquetaRondaLlave(codigoRondaPorNumeroFap(m.matchNo)),
        joinX: joinX(col),
        cardX: cardX(col),
        y: mid - CARD_H / 2,
        yTop,
        yBot,
        yMid: mid,
        feedA,
        feedB,
        showJoin,
        showFullJoin,
        partido: partidoDe(m.matchNo),
      };
    });

    const headers: { key: string; label: string; x: number }[] = [];
    const seen = new Set<number>();
    for (const m of matches) {
      const col = colDe(m.matchNo);
      if (seen.has(col)) continue;
      seen.add(col);
      headers.push({
        key: codigoRondaPorNumeroFap(m.matchNo),
        label: etiquetaRondaLlave(codigoRondaPorNumeroFap(m.matchNo)),
        x: cardX(col),
      });
    }
    headers.sort((a, b) => a.x - b.x);

    return {
      byeSlots,
      matchNodes,
      headers,
      numeros,
      width: anchoLienzoLlave(maxCol + 1),
      height: HEADER_H + PAD_Y * 2 + Math.max(leaves.length, 1) * SLOT,
    };
  }, [matches, partidos, inicioNumeracion]);

  useEffect(() => {
    if (layout) layoutWidthRef.current = layout.width;
  }, [layout]);

  useLayoutEffect(() => {
    if (!layout || fullscreen) return;
    layoutWidthRef.current = layout.width;
    const el = scrollRef.current;
    if (!el) return;
    const apply = () => {
      if (zoomTouchedRef.current) return;
      fitWidth();
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, [layout, fullscreen, fitWidth]);

  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFullscreen();
    };
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => fitWidth(), 80);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [fullscreen, closeFullscreen, fitWidth]);

  if (!layout || matches.length === 0) {
    return (
      <div className="text-center p-10 text-brand-ayuda text-sm border border-dashed border-white/10 rounded-2xl">
        Sin plantilla FAP para este cuadro.
      </div>
    );
  }

  const nacional = esAlcanceNacional(alcance);

  const shell = (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[220] flex flex-col bg-[#0a0a0a]"
          : "rounded-2xl border border-brand-input bg-brand-card overflow-hidden"
      }
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen || undefined}
      aria-label={fullscreen ? `${plantilla} a pantalla completa` : undefined}
    >
      <div
        className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-brand-input bg-brand-input/40 ${
          fullscreen ? "shrink-0" : ""
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-brand-chartreuse">
            {plantilla}
          </span>
          {pairCount != null && (
            <span className="text-xs font-bold text-gray-400 truncate">
              {pairCount} parejas · orden oficial
            </span>
          )}
          {fullscreen ? (
            <span className="hidden sm:inline text-xs text-brand-ayuda">
              Esc para cerrar
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-brand-ayuda hidden sm:inline mr-1">
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
            onClick={() => setZoomManual(1)}
            className="min-w-[3.25rem] h-8 rounded-lg border border-brand-input bg-brand-input/50 px-2 text-xs font-black tabular-nums text-brand-chartreuse hover:border-brand-chartreuse/40 transition-colors"
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
            onClick={fitWidthFromUser}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-input bg-brand-input/50 text-gray-300 hover:text-brand-chartreuse hover:border-brand-chartreuse/40 transition-colors"
            aria-label="Ajustar al ancho"
            title="Ajustar al ancho"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          {fullscreen ? (
            <button
              type="button"
              onClick={closeFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-chartreuse/40 bg-brand-chartreuse/15 text-brand-chartreuse hover:bg-brand-chartreuse/25 transition-colors"
              aria-label="Cerrar pantalla completa"
              title="Cerrar (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={openFullscreen}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-chartreuse/40 bg-brand-chartreuse/15 text-brand-chartreuse hover:bg-brand-chartreuse/25 transition-colors"
              aria-label="Abrir en pantalla completa"
              title="Pantalla completa"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className={`overflow-auto overscroll-x-contain touch-pan-x touch-pan-y pb-2 ${
          fullscreen
            ? "flex-1 min-h-0"
            : mobile
              ? "max-h-[min(70vh,640px)]"
              : "max-h-[min(78vh,920px)]"
        }`}
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          bumpZoom(e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP);
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            width: layout.width * zoom,
            height: layout.height * zoom,
          }}
        >
          <div
            className="absolute top-0 left-0"
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
            {layout.headers.map((header) => (
              <p
                key={header.key}
                className="absolute z-[2] text-center text-xs font-black uppercase tracking-[0.16em] text-brand-chartreuse/90"
                style={{ left: header.x, top: 8, width: CARD_W }}
              >
                {header.label}
              </p>
            ))}

            <svg
              className="absolute inset-0 pointer-events-none z-[1]"
              width={layout.width}
              height={layout.height}
              aria-hidden
            >
              {layout.matchNodes.map((node) => {
                if (!node.showJoin) return null;
                const trazo = node.partido?.ganador
                  ? "text-brand-chartreuse"
                  : "text-gray-400";

                const drawFeed = (feed: Feed | null, entryY: number, key: string) => {
                  if (!feed) return null;
                  const ex = feed.x + Math.max(14, (node.joinX - feed.x) * 0.45);
                  if (Math.abs(feed.y - entryY) < 1) {
                    return (
                      <line
                        key={key}
                        x1={feed.x}
                        y1={entryY}
                        x2={node.joinX}
                        y2={entryY}
                        className={trazo}
                        stroke="currentColor"
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
                        className={trazo}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="square"
                      />
                      <line
                        x1={ex}
                        y1={feed.y}
                        x2={ex}
                        y2={entryY}
                        className={trazo}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="square"
                      />
                      <line
                        x1={ex}
                        y1={entryY}
                        x2={node.joinX}
                        y2={entryY}
                        className={trazo}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="square"
                      />
                    </g>
                  );
                };

                // Entry Y: si hay feed, usar su Y; si no (lado BYE ya representado), usar mid.
                const entryA = node.feedA ? node.feedA.y : node.yMid;
                const entryB = node.feedB ? node.feedB.y : node.yMid;

                return (
                  <g key={`line-${node.matchNo}`}>
                    {drawFeed(node.feedA, entryA, `${node.matchNo}-a`)}
                    {drawFeed(node.feedB, entryB, `${node.matchNo}-b`)}
                    {node.showFullJoin ||
                    (node.feedA && node.feedB) ||
                    Math.abs(node.yTop - node.yBot) > 2 ? (
                      <line
                        x1={node.joinX}
                        y1={node.yTop}
                        x2={node.joinX}
                        y2={node.yBot}
                        className={trazo}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="square"
                      />
                    ) : null}
                    <line
                      x1={node.joinX}
                      y1={node.yMid}
                      x2={node.cardX}
                      y2={node.yMid}
                        className={trazo}
                        stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="square"
                    />
                  </g>
                );
              })}
            </svg>

            {layout.matchNodes
              .filter((n) => n.showJoin)
              .map((node) => (
                <div
                  key={`badge-${node.matchNo}`}
                  className="absolute z-[3] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: node.joinX, top: node.yMid }}
                >
                  <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md border border-brand-chartreuse/40 bg-[#121212] px-1.5 py-0.5 text-xs font-black tabular-nums text-brand-chartreuse shadow-sm">
                    {node.numero}
                  </span>
                </div>
              ))}

            {/* Slots BYE: mismo tamaño que MatchCard, columna de apertura */}
            {layout.byeSlots.map((bye) => {
              const p = bye.partido;
              const side = bye.side;
              const j1 = side === "a" ? p?.equipo_a_j1 : p?.equipo_b_j1;
              const j2 = side === "a" ? p?.equipo_a_j2 : p?.equipo_b_j2;
              const avatarJ1 =
                side === "a" ? p?.equipo_a_avatar_j1 : p?.equipo_b_avatar_j1;
              const avatarJ2 =
                side === "a" ? p?.equipo_a_avatar_j2 : p?.equipo_b_avatar_j2;
              const usuarioId =
                side === "a" ? p?.equipo_a_usuario_id : p?.equipo_b_usuario_id;
              const usuario2Id =
                side === "a"
                  ? p?.equipo_a_usuario2_id
                  : p?.equipo_b_usuario2_id;
              const denominacion =
                side === "a"
                  ? p?.equipo_a_denominacion
                  : p?.equipo_b_denominacion;
              const provincia =
                side === "a" ? p?.equipo_a_provincia : p?.equipo_b_provincia;
              const letra =
                side === "a"
                  ? p?.equipo_a_letra_prioridad
                  : p?.equipo_b_letra_prioridad;
              const pairId = side === "a" ? p?.equipo_a_id : p?.equipo_b_id;
              const isCabeza =
                !!pairId && !!cabezasSerieIds?.has(String(pairId));

              return (
                <div
                  key={`bye-${bye.leaf}`}
                  className="absolute z-[2] box-border rounded-2xl border border-dashed border-brand-chartreuse/40 bg-brand-card px-3 py-3 shadow-sm"
                  style={{
                    left: bye.cardX,
                    top: bye.y,
                    width: CARD_W,
                    minHeight: CARD_H,
                  }}
                  title={`Pase directo → partido #${bye.targetNumero}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-brand-ayuda">
                      Pase directo
                    </span>
                    <span className="text-xs font-black text-brand-chartreuse bg-brand-chartreuse/10 px-1.5 py-0.5 rounded">
                      → #{bye.targetNumero}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="text-xs font-bold tracking-wide text-brand-chartreuse bg-brand-chartreuse/10 px-1.5 py-0.5 rounded">
                          {bye.seed}
                        </span>
                        {isCabeza ? (
                          <span className="text-xs font-bold tracking-wide text-amber-500 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded">
                            #1
                          </span>
                        ) : null}
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
                          provincia={provincia}
                          letra_prioridad={letra}
                          alcanceNacional={nacional}
                          compact
                          variant="stacked"
                        />
                      ) : (
                        <div className="flex items-center gap-2 min-h-[2.25rem]">
                          <PlayerAvatar src={null} size="md" />
                          <p className="text-xs font-medium text-brand-ayuda italic">
                            {POR_DEFINIR}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-white/5 pt-3">
                      <div className="flex flex-wrap items-center gap-1 mb-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-400/90 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded">
                          Libre
                        </span>
                      </div>
                      <div className="flex items-center gap-2 min-h-[2.25rem]">
                        <PlayerAvatar src={null} size="md" />
                        <p className="text-xs font-medium text-brand-ayuda italic">
                          Libre
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {layout.matchNodes.map((node) => {
              if (!node.partido) {
                return (
                  <div
                    key={node.matchNo}
                    className="absolute z-[2] rounded-2xl border border-dashed border-white/10 bg-black/20 flex items-center justify-center text-xs text-brand-ayuda"
                    style={{
                      left: node.cardX,
                      top: node.y,
                      width: CARD_W,
                      minHeight: CARD_H,
                    }}
                  >
                    Partido #{node.numero}
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
                    numeroVisible={node.numero}
                    origenEquipoA={formatSeed(node.a, layout.numeros)}
                    origenEquipoB={formatSeed(node.b, layout.numeros)}
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

  if (fullscreen && portalReady) {
    return (
      <>
        <div
          className={`rounded-2xl border border-dashed border-white/10 bg-black/20 ${
            mobile ? "h-[min(70vh,640px)]" : "h-[min(78vh,420px)]"
          } flex items-center justify-center text-xs text-brand-ayuda`}
          aria-hidden
        >
          Cuadro en pantalla completa…
        </div>
        {createPortal(shell, document.body)}
      </>
    );
  }

  return shell;
}
