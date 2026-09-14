"use client";

import React, { useMemo } from "react";
import { ArrowRight, Award, Medal, Trophy } from "lucide-react";
import type { FapMatrixMatch } from "./FapBracketDiagram";

/**
 * Mini-panel "Si clasificás 1/2/3 vas a...".
 *
 * Dado una zona (letra) y la matriz FAP del torneo, deriva a qué partido de
 * llave iría el 1º, 2º y (si aplica) 3º clasificado. Muestra ronda y # de
 * cruce para que los jugadores entiendan la caída sin abrir el diagrama.
 */
interface CaidaLlavePanelProps {
  /** Letra de la zona (A, B, C...) */
  letraZona: string;
  fapMatrix: FapMatrixMatch[];
  cupoClasificacion: number;
}

const NOMBRE_RONDA_POR_MATCH_COUNT: Array<{ min: number; nombre: string }> = [
  { min: 1, nombre: "FINAL" },
  { min: 2, nombre: "SEMIS" },
  { min: 4, nombre: "CUARTOS" },
  { min: 8, nombre: "OCTAVOS" },
  { min: 16, nombre: "16avos" },
  { min: 32, nombre: "32avos" },
];

/**
 * Deriva el nombre de la ronda para un matchNo dado, contando cuántos matches
 * están al mismo nivel (mismo número de descendientes vs `winnerTo`).
 */
function derivarNombreRonda(
  matchNo: number,
  matrix: FapMatrixMatch[],
): string {
  // Contamos cuantos matches convergen al mismo destino (nivel = numero de matches en la misma ronda).
  const winnerToMap = new Map<number, number>();
  for (const m of matrix) {
    if (m.winnerTo != null) {
      winnerToMap.set(m.winnerTo, (winnerToMap.get(m.winnerTo) || 0) + 1);
    }
  }

  // Profundidad: la ronda de este match depende de cuantas rondas quedan por delante.
  // Contamos los matches que van rio abajo desde este.
  const visitados = new Set<number>();
  const stack = [matchNo];
  let ronda = 0;
  while (stack.length) {
    const actual = stack.pop()!;
    if (visitados.has(actual)) continue;
    visitados.add(actual);
    const match = matrix.find((m) => m.matchNo === actual);
    if (match && match.winnerTo != null) {
      stack.push(match.winnerTo);
      ronda++;
    }
  }
  // Numero de matches en la misma ronda: 2^ronda si es un bracket puro.
  const matchesEnRonda = Math.max(1, Math.pow(2, ronda));
  const entry = NOMBRE_RONDA_POR_MATCH_COUNT.find(
    (e) => matchesEnRonda === e.min,
  );
  return entry?.nombre || `Ronda ${matchesEnRonda}`;
}

const POSICION_META: Record<
  1 | 2 | 3,
  { label: string; icon: React.ReactNode; className: string }
> = {
  1: {
    label: "1° clasificado",
    icon: <Trophy className="size-3.5" />,
    className:
      "border-brand-chartreuse/30 bg-brand-chartreuse/10 text-brand-chartreuse",
  },
  2: {
    label: "2° clasificado",
    icon: <Medal className="size-3.5" />,
    className: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  },
  3: {
    label: "3° clasificado",
    icon: <Award className="size-3.5" />,
    className: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  },
};

export const CaidaLlavePanel: React.FC<CaidaLlavePanelProps> = ({
  letraZona,
  fapMatrix,
  cupoClasificacion,
}) => {
  const caidas = useMemo(() => {
    const out: Array<{ posicion: 1 | 2 | 3; matchNo: number; ronda: string }> = [];
    for (const pos of [1, 2, 3] as const) {
      if (pos > cupoClasificacion) break;
      const ref = `${pos}${letraZona}`;
      // Buscamos el match que tiene esta referencia como equipo A o B.
      const target = fapMatrix.find(
        (m) => m.a.toUpperCase() === ref || m.b.toUpperCase() === ref,
      );
      if (!target) continue;
      out.push({
        posicion: pos,
        matchNo: target.matchNo,
        ronda: derivarNombreRonda(target.matchNo, fapMatrix),
      });
    }
    return out;
  }, [letraZona, fapMatrix, cupoClasificacion]);

  if (caidas.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/5 bg-brand-black/40 p-3">
      <div className="flex items-center gap-2 mb-2">
        <ArrowRight className="size-3.5 text-brand-chartreuse" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          Si clasificás en Zona {letraZona}, jugás en la llave:
        </p>
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {caidas.map((c) => {
          const meta = POSICION_META[c.posicion];
          return (
            <li
              key={c.posicion}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${meta.className}`}
            >
              <span className="shrink-0">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {meta.label}
                </p>
                <p className="text-xs font-black leading-tight">
                  {c.ronda} · Cruce #{c.matchNo}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
