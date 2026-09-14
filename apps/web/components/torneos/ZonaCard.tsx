"use client";

import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Flag,
  Trophy,
  Users,
} from "lucide-react";
import type { Partido } from "@/utils/types";
import { TablaPosicionesZona } from "./TablaPosicionesZona";
import type { ZonaDrag } from "./DragDropPairing";
import type { FapMatrixMatch } from "./FapBracketDiagram";
import { clasificadosPorZona } from "@/utils/clasificacionZonas";
import { CaidaLlavePanel } from "./CaidaLlavePanel";

/**
 * Wrapper colapsable de una zona en la pestana "Fase de grupos".
 * Encabezado siempre visible con: nombre, chip de partidos, chip de clasificados,
 * chip de estado (completa/en juego), y el toggle desplegar/contraer.
 *
 * Al desplegar muestra:
 * - Tabla de posiciones (con su propio toggle "Ver detalle" interno).
 * - Mini-panel "si clasificás 1/2/3 vas a..." (si hay matriz FAP disponible).
 * - Lista compacta de partidos de la zona con resultado.
 */
interface ZonaCardProps {
  zona: ZonaDrag;
  partidos: Partido[];
  alcance?: string | null;
  fapMatrix?: FapMatrixMatch[];
  defaultOpen?: boolean;
}

function letraZona(nombre: string): string | null {
  const m = /^ZONA\s+([A-Z])/i.exec(nombre.trim());
  return m ? m[1].toUpperCase() : null;
}

function pareja1Line(p: {
  jugador1_nombre?: string;
  jugador2_nombre?: string | null;
}): string {
  const a = (p.jugador1_nombre || "").trim();
  const b = (p.jugador2_nombre || "").trim();
  if (a && b) return `${a} / ${b}`;
  if (a) return a;
  return "Pareja";
}

function scoreCortoPartido(p: Partido): string | null {
  const sets: Array<[number | null | undefined, number | null | undefined]> = [
    [p.set1_a, p.set1_b],
    [p.set2_a, p.set2_b],
    [p.set3_a, p.set3_b],
  ];
  const jugados = sets.filter(([a, b]) => a != null && b != null);
  if (!jugados.length) return null;
  return jugados.map(([a, b]) => `${a}-${b}`).join(" · ");
}

export const ZonaCard: React.FC<ZonaCardProps> = ({
  zona,
  partidos,
  alcance,
  fapMatrix,
  defaultOpen = true,
}) => {
  const [open, setOpen] = useState(defaultOpen);

  const totalPartidos = partidos.length;
  const partidosJugados = useMemo(
    () => partidos.filter((p) => p.ganador != null).length,
    [partidos],
  );
  const cupoClasificacion = clasificadosPorZona(zona.parejas.length);
  const completa = totalPartidos > 0 && partidosJugados === totalPartidos;

  const letra = letraZona(zona.nombre);

  return (
    <div className="rounded-2xl border border-white/5 bg-brand-card overflow-hidden">
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
        aria-expanded={open}
      >
        <span className="inline-flex items-center justify-center size-9 rounded-xl bg-brand-chartreuse/10 border border-brand-chartreuse/30 text-brand-chartreuse font-black text-sm shrink-0">
          {letra || "Z"}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-brand-white uppercase tracking-wide truncate">
            {zona.nombre}
          </p>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <ZonaChip
              icon={<Users className="size-3" />}
              label={`${zona.parejas.length} parejas`}
            />
            <ZonaChip
              icon={<Trophy className="size-3" />}
              label={`${cupoClasificacion} clasifican`}
            />
            <ZonaChip
              icon={<Flag className="size-3" />}
              label={`${partidosJugados}/${totalPartidos} partidos`}
              tone={completa ? "ok" : "neutral"}
            />
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center justify-center size-8 rounded-lg text-gray-400 hover:text-brand-white">
          {open ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/5 p-4 space-y-4">
          {/* Tabla de posiciones (con su propio toggle "Ver detalle") */}
          <TablaPosicionesZona
            nombreZona={zona.nombre}
            parejasInscritas={zona.parejas}
            partidosZona={partidos}
            alcance={alcance || undefined}
            capacidadZona={zona.parejas.length}
          />

          {/* Mini-panel "si clasificas 1/2/3 vas a..." */}
          {letra && fapMatrix && fapMatrix.length > 0 && (
            <CaidaLlavePanel
              letraZona={letra}
              fapMatrix={fapMatrix}
              cupoClasificacion={cupoClasificacion}
            />
          )}

          {/* Lista compacta de partidos de la zona */}
          {partidos.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                Partidos de la zona
              </p>
              <ul className="space-y-1.5">
                {partidos
                  .slice()
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                  .map((p) => {
                    const parejaA = zona.parejas.find(
                      (x) => x.id === p.equipo_a_id,
                    );
                    const parejaB = zona.parejas.find(
                      (x) => x.id === p.equipo_b_id,
                    );
                    const score = scoreCortoPartido(p);
                    const isWinnerA =
                      p.ganador && p.equipo_a_id && p.ganador === p.equipo_a_id;
                    const isWinnerB =
                      p.ganador && p.equipo_b_id && p.ganador === p.equipo_b_id;
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-brand-black/40 border border-white/5"
                      >
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-8 shrink-0">
                          #{p.orden || "?"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-xs truncate ${
                              isWinnerA
                                ? "text-brand-chartreuse font-bold"
                                : "text-brand-white"
                            }`}
                          >
                            {parejaA ? pareja1Line(parejaA) : "Por definir"}
                          </p>
                          <p
                            className={`text-xs truncate ${
                              isWinnerB
                                ? "text-brand-chartreuse font-bold"
                                : "text-gray-400"
                            }`}
                          >
                            vs{" "}
                            {parejaB ? pareja1Line(parejaB) : "Por definir"}
                          </p>
                        </div>
                        {score ? (
                          <span className="shrink-0 text-xs font-black text-brand-white tabular-nums">
                            {score}
                          </span>
                        ) : (
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Pendiente
                          </span>
                        )}
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ZonaChipProps {
  icon: React.ReactNode;
  label: string;
  tone?: "ok" | "neutral";
}

function ZonaChip({ icon, label, tone = "neutral" }: ZonaChipProps) {
  const cls =
    tone === "ok"
      ? "border-brand-chartreuse/30 bg-brand-chartreuse/10 text-brand-chartreuse"
      : "border-white/10 bg-white/5 text-gray-400";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-black uppercase tracking-widest ${cls}`}
    >
      {icon}
      {label}
    </span>
  );
}
