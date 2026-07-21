"use client";

import React, { useMemo } from "react";
import { Partido } from "@/utils/types";
import { Trophy, CheckCircle2 } from "lucide-react";

export interface ParejaStats {
  inscripcionId: string;
  nombre: string;
  club: string;
  pts: number;
  pj: number;
  pg: number;
  pp: number;
  sf: number;
  sc: number;
  ds: number;
  gf: number;
  gc: number;
  dg: number;
  stb: number;
}

interface TablaPosicionesZonaProps {
  nombreZona: string;
  parejasInscritas: {
    id: string; // inscripcionId
    jugador1_nombre?: string;
    jugador2_nombre?: string | null;
    club?: string;
    cabezaDeSerie?: boolean;
  }[];
  partidosZona: Partido[];
}

export const TablaPosicionesZona: React.FC<TablaPosicionesZonaProps> = ({
  nombreZona,
  parejasInscritas,
  partidosZona,
}) => {
  const cleanName = (name?: string | null) => {
    if (!name) return "";
    const cleaned = name
      .trim()
      .replace(/^[\s,.\-]+/, "")
      .replace(/[\s,.\-]+$/, "");
    if (cleaned === "," || cleaned === "." || cleaned === "") return "";
    return cleaned;
  };

  const stats = useMemo(() => {
    const map: Record<string, ParejaStats> = {};

    parejasInscritas.forEach((p) => {
      const j1 = cleanName(p.jugador1_nombre);
      const j2 = cleanName(p.jugador2_nombre);
      const nombre = j1
        ? `${j1} ${j2 && j2 !== "-" ? `/ ${j2}` : ""}`
        : "Pareja";

      map[p.id] = {
        inscripcionId: p.id,
        nombre,
        club: p.club || "Sin club asignado",
        pts: 0,
        pj: 0,
        pg: 0,
        pp: 0,
        sf: 0,
        sc: 0,
        ds: 0,
        gf: 0,
        gc: 0,
        dg: 0,
        stb: 0,
      };
    });

    partidosZona.forEach((match) => {
      if (
        match.estado_partido === "Finalizado" ||
        (match.ganador && match.set1_a !== null && match.set1_b !== null)
      ) {
        const idA = match.equipo_a_id;
        const idB = match.equipo_b_id;

        if (!idA || !idB || !map[idA] || !map[idB]) return;

        const stA = map[idA];
        const stB = map[idB];

        stA.pj += 1;
        stB.pj += 1;

        if (match.es_wo) {
          if (match.ganador === idA) {
            stA.pg += 1;
            stA.pts += 2;
            stB.pp += 1;
            stB.pts += match.es_injustificado_wo ? 0 : 1;
            stA.sf += 2;
            stA.sc += 0;
            stA.gf += 12;
            stA.gc += 0;
          } else {
            stB.pg += 1;
            stB.pts += 2;
            stA.pp += 1;
            stA.pts += match.es_injustificado_wo ? 0 : 1;
            stB.sf += 2;
            stB.sc += 0;
            stB.gf += 12;
            stB.gc += 0;
          }
          return;
        }

        let setsGnosA = 0;
        let setsGnosB = 0;

        const s1A = Number(match.set1_a || 0);
        const s1B = Number(match.set1_b || 0);
        stA.gf += s1A;
        stA.gc += s1B;
        stB.gf += s1B;
        stB.gc += s1A;

        if (s1A > s1B) setsGnosA++;
        else if (s1B > s1A) setsGnosB++;

        if (match.set2_a !== null && match.set2_b !== null) {
          const s2A = Number(match.set2_a);
          const s2B = Number(match.set2_b);
          stA.gf += s2A;
          stA.gc += s2B;
          stB.gf += s2B;
          stB.gc += s2A;

          if (s2A > s2B) setsGnosA++;
          else if (s2B > s2A) setsGnosB++;
        }

        if (match.set3_a !== null && match.set3_b !== null) {
          const s3A = Number(match.set3_a);
          const s3B = Number(match.set3_b);
          stA.gf += s3A;
          stA.gc += s3B;
          stB.gf += s3B;
          stB.gc += s3A;

          if (match.es_supertiebreak) {
            stA.stb += 1;
            stB.stb += 1;
          }

          if (s3A > s3B) setsGnosA++;
          else if (s3B > s3A) setsGnosB++;
        }

        stA.sf += setsGnosA;
        stA.sc += setsGnosB;
        stB.sf += setsGnosB;
        stB.sc += setsGnosA;

        if (match.ganador === idA) {
          stA.pg += 1;
          stA.pts += 2;
          stB.pp += 1;
          stB.pts += 1;
        } else if (match.ganador === idB) {
          stB.pg += 1;
          stB.pts += 2;
          stA.pp += 1;
          stA.pts += 1;
        }
      }
    });

    const lista = Object.values(map).map((st) => ({
      ...st,
      ds: st.sf - st.sc,
      dg: st.gf - st.gc,
    }));

    lista.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.ds !== a.ds) return b.ds - a.ds;
      return b.dg - a.dg;
    });

    return lista;
  }, [parejasInscritas, partidosZona]);

  return (
    <div className="bg-[#161616] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-brand-chartreuse" />
          <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">
            Posiciones · {nombreZona}
          </h4>
        </div>
        <span className="text-[10px] font-black bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20 px-2.5 py-0.5 rounded-full uppercase">
          Clasificación Oficial
        </span>
      </div>

      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <th className="py-2.5 px-3 min-w-50">Participantes / Dupla</th>
              <th className="py-2.5 px-2 text-center text-brand-chartreuse font-black">
                Pts
              </th>
              <th className="py-2.5 px-2 text-center">PJ</th>
              <th className="py-2.5 px-2 text-center text-green-400">PG</th>
              <th className="py-2.5 px-2 text-center text-red-400">PP</th>
              <th className="py-2.5 px-2 text-center">SF</th>
              <th className="py-2.5 px-2 text-center">SC</th>
              <th className="py-2.5 px-2 text-center text-brand-chartreuse">
                DS
              </th>
              <th className="py-2.5 px-2 text-center">GF</th>
              <th className="py-2.5 px-2 text-center">GC</th>
              <th className="py-2.5 px-2 text-center text-brand-chartreuse">
                DG
              </th>
              <th className="py-2.5 px-2 text-center">STB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {stats.map((row, idx) => {
              const isClasificado = idx < 2 && row.pj > 0;
              return (
                <tr
                  key={row.inscripcionId}
                  className={`hover:bg-white/5 transition-colors ${
                    isClasificado ? "bg-brand-chartreuse/5" : ""
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-6 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 ${
                          idx === 0
                            ? "bg-brand-chartreuse text-brand-black"
                            : idx === 1
                              ? "bg-white/10 text-white"
                              : "bg-black/40 text-gray-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-extrabold text-white text-xs flex items-center gap-1.5">
                          {row.nombre}
                          {isClasificado && (
                            <CheckCircle2 className="size-3.5 text-brand-chartreuse shrink-0" />
                          )}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold">
                          {row.club}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-center font-black text-brand-chartreuse text-sm">
                    {row.pts}
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-gray-300">
                    {row.pj}
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-green-400">
                    {row.pg}
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-red-400">
                    {row.pp}
                  </td>
                  <td className="py-3 px-2 text-center">{row.sf}</td>
                  <td className="py-3 px-2 text-center">{row.sc}</td>
                  <td className="py-3 px-2 text-center font-extrabold text-brand-chartreuse">
                    {row.ds > 0 ? `+${row.ds}` : row.ds}
                  </td>
                  <td className="py-3 px-2 text-center">{row.gf}</td>
                  <td className="py-3 px-2 text-center">{row.gc}</td>
                  <td className="py-3 px-2 text-center font-extrabold text-brand-chartreuse">
                    {row.dg > 0 ? `+${row.dg}` : row.dg}
                  </td>
                  <td className="py-3 px-2 text-center text-gray-500">
                    {row.stb}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
