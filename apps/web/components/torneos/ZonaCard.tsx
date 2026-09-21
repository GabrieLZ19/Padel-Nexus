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
import { clasificadosPorZona } from "@/utils/clasificacionZonas";
import { formatNombrePareja } from "@/utils/nombrePareja";

/**
 * Panel de zona en "Fase de grupos".
 * Siempre visible (sin acordeón de card): posiciones + partidos en layout
 * de dos columnas en desktop para poder comparar varias zonas a la vez.
 */
interface ZonaCardProps {
  zona: ZonaDrag;
  partidos: Partido[];
  alcance?: string | null;
  /** id DOM para anclas / chips de navegación */
  anchorId?: string;
  /** true = 3er set completo (tradicional); false = STB u otro */
  tercerSetCompleto?: boolean;
}

function letraZona(nombre: string): string | null {
  const m = /^ZONA\s+([A-Z])/i.exec(nombre.trim());
  return m ? m[1].toUpperCase() : null;
}

type SetSlot = { a: number | null; b: number | null; jugado: boolean };

function slotsMarcador(
  p: Partido,
  tercerSetCompleto: boolean,
): SetSlot[] {
  const raw: SetSlot[] = [
    {
      a: p.set1_a ?? null,
      b: p.set1_b ?? null,
      jugado: p.set1_a != null && p.set1_b != null,
    },
    {
      a: p.set2_a ?? null,
      b: p.set2_b ?? null,
      jugado: p.set2_a != null && p.set2_b != null,
    },
    {
      a: p.set3_a ?? null,
      b: p.set3_b ?? null,
      jugado: p.set3_a != null && p.set3_b != null,
    },
  ];

  if (tercerSetCompleto) {
    // Formato tradicional: siempre 3 columnas (vacío si no se jugó el 3ro)
    return raw;
  }

  // STB / no tradicional: solo sets jugados
  return raw.filter((s) => s.jugado);
}

function MarcadorSets({
  partido,
  tercerSetCompleto,
}: {
  partido: Partido;
  tercerSetCompleto: boolean;
}) {
  const slots = slotsMarcador(partido, tercerSetCompleto);
  const jugados = slots.filter((s) => s.jugado).length;
  if (jugados === 0) return null;

  return (
    <div
      className="shrink-0 inline-grid gap-px rounded-lg overflow-hidden border border-white/15 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
      style={{
        gridTemplateColumns: `repeat(${slots.length}, minmax(1.75rem, 2rem))`,
        gridTemplateRows: "auto auto",
      }}
    >
      {slots.map((s, i) => {
        const winA = s.jugado && Number(s.a) > Number(s.b);
        return (
          <div
            key={`a-${i}`}
            className={`flex items-center justify-center py-1.5 px-1 ${
              s.jugado ? "bg-[#121212]" : "bg-[#0a0a0a]"
            }`}
            title={
              i === 2 && !tercerSetCompleto ? "Super Tie-break" : `Set ${i + 1}`
            }
          >
            <span
              className={`text-xs font-black tabular-nums leading-none ${
                !s.jugado
                  ? "text-white/15"
                  : winA
                    ? "text-brand-chartreuse"
                    : "text-white/90"
              }`}
            >
              {s.jugado ? s.a : "·"}
            </span>
          </div>
        );
      })}
      {slots.map((s, i) => {
        const winB = s.jugado && Number(s.b) > Number(s.a);
        return (
          <div
            key={`b-${i}`}
            className={`flex items-center justify-center py-1.5 px-1 border-t border-white/5 ${
              s.jugado ? "bg-[#0e0e0e]" : "bg-[#080808]"
            }`}
          >
            <span
              className={`text-xs font-black tabular-nums leading-none ${
                !s.jugado
                  ? "text-white/15"
                  : winB
                    ? "text-brand-chartreuse"
                    : "text-white/55"
              }`}
            >
              {s.jugado ? s.b : "·"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const ZonaCard: React.FC<ZonaCardProps> = ({
  zona,
  partidos,
  alcance,
  anchorId,
  tercerSetCompleto = true,
}) => {
  const [showMatches, setShowMatches] = useState(true);

  const totalPartidos = partidos.length;
  const partidosJugados = useMemo(
    () => partidos.filter((p) => p.ganador != null).length,
    [partidos],
  );
  const cupoClasificacion = clasificadosPorZona(zona.parejas.length);
  const completa = totalPartidos > 0 && partidosJugados === totalPartidos;
  const progresoPct =
    totalPartidos > 0
      ? Math.round((partidosJugados / totalPartidos) * 100)
      : 0;

  const letra = letraZona(zona.nombre);

  const partidosOrdenados = useMemo(
    () =>
      [...partidos].sort((a, b) => {
        const doneA = a.ganador != null ? 0 : 1;
        const doneB = b.ganador != null ? 0 : 1;
        if (doneA !== doneB) return doneA - doneB;
        return (a.orden || 0) - (b.orden || 0);
      }),
    [partidos],
  );

  return (
    <section
      id={anchorId}
      className="scroll-mt-24 rounded-2xl border border-white/10 bg-gradient-to-br from-[#141414] to-[#0c0c0c] overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
    >
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-white/5 bg-black/30">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="inline-flex items-center justify-center size-10 rounded-xl bg-brand-chartreuse text-brand-black font-black text-base shrink-0 shadow-[0_0_18px_rgba(204,255,0,0.25)]">
            {letra || "Z"}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wide truncate">
                {zona.nombre}
              </h3>
              {completa && (
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-brand-chartreuse/15 text-brand-chartreuse border border-brand-chartreuse/30">
                  Completa
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3 text-brand-chartreuse/80" />
                {zona.parejas.length}{" "}
                {zona.parejas.length === 1 ? "pareja" : "parejas"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="size-3 text-brand-chartreuse/80" />
                {cupoClasificacion} clasifican
              </span>
              <span className="inline-flex items-center gap-1">
                <Flag className="size-3 text-brand-chartreuse/80" />
                {partidosJugados}/{totalPartidos || 0} partidos
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:w-44 shrink-0">
          <div className="flex-1 space-y-1">
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-500">
              <span>Progreso</span>
              <span className="text-brand-chartreuse tabular-nums">
                {progresoPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-brand-chartreuse transition-[width] duration-500 ease-out"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
          </div>
          {partidosOrdenados.length > 0 && (
            <button
              type="button"
              onClick={() => setShowMatches((v) => !v)}
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-wider text-gray-300 hover:border-brand-chartreuse/40 hover:text-brand-chartreuse transition-colors cursor-pointer"
              aria-expanded={showMatches}
            >
              {showMatches ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
              Partidos
            </button>
          )}
        </div>
      </header>

      {/* Cuerpo: posiciones | partidos */}
      <div
        className={`grid grid-cols-1 gap-0 ${
          showMatches && partidosOrdenados.length > 0
            ? "lg:grid-cols-5"
            : ""
        }`}
      >
        <div
          className={`p-4 sm:p-5 ${
            showMatches && partidosOrdenados.length > 0
              ? "lg:col-span-3 lg:border-r lg:border-white/5"
              : ""
          }`}
        >
          <TablaPosicionesZona
            nombreZona={zona.nombre}
            parejasInscritas={zona.parejas}
            partidosZona={partidos}
            alcance={alcance || undefined}
            capacidadZona={zona.parejas.length}
            embedded
          />
        </div>

        {showMatches && partidosOrdenados.length > 0 && (
          <div className="lg:col-span-2 p-4 sm:p-5 bg-black/20 border-t lg:border-t-0 border-white/5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">
              Partidos de la zona
            </p>
            <ul className="space-y-2">
              {partidosOrdenados.map((p) => {
                const parejaA = zona.parejas.find(
                  (x) => x.id === p.equipo_a_id,
                );
                const parejaB = zona.parejas.find(
                  (x) => x.id === p.equipo_b_id,
                );
                const isWinnerA =
                  p.ganador && p.equipo_a_id && p.ganador === p.equipo_a_id;
                const isWinnerB =
                  p.ganador && p.equipo_b_id && p.ganador === p.equipo_b_id;
                const done = p.ganador != null;
                const tieneMarcador = slotsMarcador(p, tercerSetCompleto).some(
                  (s) => s.jugado,
                );
                return (
                  <li
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                      done
                        ? "bg-brand-chartreuse/5 border-brand-chartreuse/20"
                        : "bg-white/[0.03] border-white/5"
                    }`}
                  >
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest w-7 shrink-0 tabular-nums">
                      #{p.orden || "?"}
                    </span>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p
                        className={`text-xs truncate ${
                          isWinnerA
                            ? "text-brand-chartreuse font-bold"
                            : "text-white font-medium"
                        }`}
                      >
                        {parejaA
                          ? formatNombrePareja(
                              parejaA.jugador1_nombre,
                              parejaA.jugador2_nombre,
                            ) || "Por definir"
                          : "Por definir"}
                      </p>
                      <p
                        className={`text-xs truncate ${
                          isWinnerB
                            ? "text-brand-chartreuse font-bold"
                            : "text-gray-400"
                        }`}
                      >
                        {parejaB
                          ? formatNombrePareja(
                              parejaB.jugador1_nombre,
                              parejaB.jugador2_nombre,
                            ) || "Por definir"
                          : "Por definir"}
                      </p>
                    </div>
                    {tieneMarcador ? (
                      <MarcadorSets
                        partido={p}
                        tercerSetCompleto={tercerSetCompleto}
                      />
                    ) : (
                      <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-gray-500 px-2 py-1 rounded-md bg-white/5">
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
    </section>
  );
};
