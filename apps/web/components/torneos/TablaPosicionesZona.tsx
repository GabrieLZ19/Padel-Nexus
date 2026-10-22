"use client";

import React, { useMemo, useState } from "react";
import { Partido } from "@/utils/types";
import {
  Trophy,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  AlertTriangle,
  Shuffle,
} from "lucide-react";
import {
  PairDisplay,
  esAlcanceNacional,
} from "@/components/torneos/PairDisplay";
import { clasificadosPorZona } from "@/utils/clasificacionZonas";
import { etiquetaInstitucion } from "@/utils/denominacionNacional";
import { formatNombrePareja } from "@/utils/nombrePareja";
import { ModalSorteoZona } from "./ModalSorteoZona";

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
  cabezaDeSerie: boolean;
  descalificada: boolean;
  seed?: number;
  jugador1_nombre?: string | null;
  jugador2_nombre?: string | null;
  usuario_id?: string | null;
  usuario2_id?: string | null;
  denominacion_nacional?: string | null;
  provincia?: string | null;
  letra_prioridad?: string | null;
  sorteo_posicion?: number | null;
  sorteo_motivo?: string | null;
  requiereSorteo?: boolean;
  empateConIds?: string[];
  criterioDesempate?: string;
}

interface TablaPosicionesZonaProps {
  nombreZona: string;
  parejasInscritas: {
    id: string; // inscripcionId
    jugador1_nombre?: string;
    jugador2_nombre?: string | null;
    club?: string;
    cabezaDeSerie?: boolean;
    descalificada?: boolean;
    seed?: number;
    usuario_id?: string | null;
    usuario2_id?: string | null;
    denominacion_nacional?: string | null;
    provincia?: string | null;
    letra_prioridad?: string | null;
    sorteo_posicion?: number | null;
    sorteo_motivo?: string | null;
  }[];
  partidosZona: Partido[];
  alcance?: string | null;
  capacidadZona?: number;
  embedded?: boolean;
  torneoId?: string;
  puedeResolverSorteo?: boolean;
  onSorteoResuelto?: () => void;
}

/**
 * Desempate de 2 parejas según el reglamento oficial FAP.
 */
function desempatarDosEquiposWeb(
  a: ParejaStats,
  b: ParejaStats,
  partidos: Partido[],
): [ParejaStats, ParejaStats] {
  // 0. Si ambas tienen sorteo_posicion registrado
  if (
    a.sorteo_posicion != null &&
    b.sorteo_posicion != null &&
    a.sorteo_posicion !== b.sorteo_posicion
  ) {
    const orden = a.sorteo_posicion < b.sorteo_posicion ? [a, b] : [b, a];
    orden[0].criterioDesempate = "Sorteo reglamentario FAP";
    orden[1].criterioDesempate = "Sorteo reglamentario FAP";
    return orden as [ParejaStats, ParejaStats];
  }

  // 1. Confrontación directa entre sí
  const partidoDirecto = partidos.find(
    (p) =>
      (p.equipo_a_id === a.inscripcionId && p.equipo_b_id === b.inscripcionId) ||
      (p.equipo_a_id === b.inscripcionId && p.equipo_b_id === a.inscripcionId),
  );
  if (partidoDirecto && partidoDirecto.ganador) {
    const primero = partidoDirecto.ganador === a.inscripcionId ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Confrontación directa";
    segundo.criterioDesempate = "Confrontación directa";
    return [primero, segundo];
  }

  // 2. Diferencia de sets
  if (a.ds !== b.ds) {
    const primero = a.ds > b.ds ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Diferencia de sets";
    segundo.criterioDesempate = "Diferencia de sets";
    return [primero, segundo];
  }

  // 3. Diferencia de games
  if (a.dg !== b.dg) {
    const primero = a.dg > b.dg ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Diferencia de games";
    segundo.criterioDesempate = "Diferencia de games";
    return [primero, segundo];
  }

  // 4. Games a favor
  if (a.gf !== b.gf) {
    const primero = a.gf > b.gf ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Games a favor";
    segundo.criterioDesempate = "Games a favor";
    return [primero, segundo];
  }

  // 5. Menor cantidad de games en contra
  if (a.gc !== b.gc) {
    const primero = a.gc < b.gc ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Menos games en contra";
    segundo.criterioDesempate = "Menos games en contra";
    return [primero, segundo];
  }

  // 6. Empate absoluto en todos los criterios
  if (
    a.sorteo_posicion != null &&
    b.sorteo_posicion != null &&
    a.sorteo_posicion !== b.sorteo_posicion
  ) {
    const orden = a.sorteo_posicion < b.sorteo_posicion ? [a, b] : [b, a];
    orden[0].criterioDesempate = "Sorteo reglamentario FAP";
    orden[1].criterioDesempate = "Sorteo reglamentario FAP";
    return orden as [ParejaStats, ParejaStats];
  }

  a.requiereSorteo = true;
  b.requiereSorteo = true;
  a.empateConIds = [b.inscripcionId];
  b.empateConIds = [a.inscripcionId];
  a.criterioDesempate = "Pendiente sorteo FAP";
  b.criterioDesempate = "Pendiente sorteo FAP";
  return [a, b];
}

/**
 * Desempate de 3 o más parejas según el reglamento FAP.
 */
function desempatarMultiplesEquiposWeb(
  teams: ParejaStats[],
  partidos: Partido[],
): ParejaStats[] {
  const allHaveSorteo = teams.every((t) => t.sorteo_posicion != null);
  if (allHaveSorteo) {
    const sorted = [...teams].sort(
      (a, b) => (a.sorteo_posicion || 0) - (b.sorteo_posicion || 0),
    );
    sorted.forEach((t) => (t.criterioDesempate = "Sorteo reglamentario FAP"));
    return sorted;
  }

  const sorted = [...teams].sort((a, b) => {
    if (b.ds !== a.ds) return b.ds - a.ds;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gf !== a.gf) return b.gf - a.gf;
    return a.gc - b.gc;
  });

  const resultado: ParejaStats[] = [];
  let i = 0;

  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].ds === sorted[i].ds &&
      sorted[j].dg === sorted[i].dg &&
      sorted[j].gf === sorted[i].gf &&
      sorted[j].gc === sorted[i].gc
    ) {
      j++;
    }

    const subgrupo = sorted.slice(i, j);
    if (subgrupo.length === 1) {
      subgrupo[0].criterioDesempate = "Estadística de sets/games";
      resultado.push(subgrupo[0]);
    } else if (subgrupo.length === 2) {
      resultado.push(...desempatarDosEquiposWeb(subgrupo[0], subgrupo[1], partidos));
    } else {
      const allSorteo = subgrupo.every((t) => t.sorteo_posicion != null);
      if (allSorteo) {
        subgrupo.sort(
          (a, b) => (a.sorteo_posicion || 0) - (b.sorteo_posicion || 0),
        );
        subgrupo.forEach((t) => (t.criterioDesempate = "Sorteo reglamentario FAP"));
        resultado.push(...subgrupo);
      } else {
        const ids = subgrupo.map((t) => t.inscripcionId);
        subgrupo.forEach((t) => {
          t.requiereSorteo = true;
          t.empateConIds = ids.filter((id) => id !== t.inscripcionId);
          t.criterioDesempate = "Pendiente sorteo FAP";
        });
        resultado.push(...subgrupo);
      }
    }
    i = j;
  }

  return resultado;
}

export const TablaPosicionesZona: React.FC<TablaPosicionesZonaProps> = ({
  nombreZona,
  parejasInscritas,
  partidosZona,
  alcance,
  capacidadZona,
  embedded = false,
  torneoId,
  puedeResolverSorteo = false,
  onSorteoResuelto,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [modalSorteoOpen, setModalSorteoOpen] = useState(false);
  const nacional = esAlcanceNacional(alcance);
  const cupoClasificacion = clasificadosPorZona(
    capacidadZona ?? parejasInscritas.length,
  );

  const stats = useMemo(() => {
    const map: Record<string, ParejaStats> = {};

    parejasInscritas.forEach((p) => {
      const nombre =
        formatNombrePareja(p.jugador1_nombre, p.jugador2_nombre) || "Pareja";

      map[p.id] = {
        inscripcionId: p.id,
        nombre,
        club: etiquetaInstitucion({
          denominacion_nacional: p.denominacion_nacional,
          provincia: p.provincia,
          letra_prioridad: p.letra_prioridad,
        }),
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
        cabezaDeSerie: Boolean(p.cabezaDeSerie),
        descalificada: Boolean(p.descalificada),
        seed: p.seed,
        jugador1_nombre: p.jugador1_nombre,
        jugador2_nombre: p.jugador2_nombre,
        usuario_id: p.usuario_id,
        usuario2_id: p.usuario2_id,
        denominacion_nacional: p.denominacion_nacional,
        provincia: p.provincia,
        letra_prioridad: p.letra_prioridad,
        sorteo_posicion: p.sorteo_posicion ?? null,
        sorteo_motivo: p.sorteo_motivo ?? null,
        requiereSorteo: false,
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

        if (match.es_wo && !match.es_lesion) {
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

    // Separar habilitadas de descalificadas
    const habilitadas = lista.filter((t) => !t.descalificada);
    const descalificadas = lista.filter((t) => t.descalificada);

    // Agrupar por puntos y aplicar cascada FAP
    const groups: Record<number, ParejaStats[]> = {};
    habilitadas.forEach((team) => {
      const pts = team.pts;
      if (!groups[pts]) groups[pts] = [];
      groups[pts].push(team);
    });

    const sortedPts = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);

    const resultado: ParejaStats[] = [];

    for (const pts of sortedPts) {
      const tiedTeams = groups[pts];
      if (tiedTeams.length === 1) {
        tiedTeams[0].criterioDesempate = "Puntos directos";
        resultado.push(tiedTeams[0]);
      } else if (tiedTeams.length === 2) {
        resultado.push(
          ...desempatarDosEquiposWeb(tiedTeams[0], tiedTeams[1], partidosZona),
        );
      } else {
        resultado.push(
          ...desempatarMultiplesEquiposWeb(tiedTeams, partidosZona),
        );
      }
    }

    return [...resultado, ...descalificadas];
  }, [parejasInscritas, partidosZona]);

  // Identificar parejas en empate absoluto para sorteo
  const parejasEnSorteo = useMemo(() => {
    return stats.filter((s) => s.requiereSorteo);
  }, [stats]);

  const posicionesEnDisputa = useMemo(() => {
    if (parejasEnSorteo.length === 0) return [];
    return stats
      .map((s, idx) => (s.requiereSorteo ? idx + 1 : null))
      .filter((pos): pos is number => pos !== null);
  }, [stats, parejasEnSorteo]);

  const haySorteoPendiente = parejasEnSorteo.length > 0;

  return (
    <div
      className={
        embedded
          ? "space-y-3"
          : "bg-[#161616] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl"
      }
    >
      {/* Header */}
      <div
        className={`flex flex-wrap items-start justify-between gap-x-3 gap-y-2 ${
          embedded ? "" : "border-b border-white/5 pb-3"
        }`}
      >
        <div className="flex min-w-0 flex-1 basis-full items-start gap-2 sm:basis-48">
          <Trophy className="mt-0.5 size-4 shrink-0 text-brand-chartreuse" />
          <h4 className="min-w-0 text-sm font-extrabold uppercase leading-snug tracking-wide text-white text-pretty">
            Posiciones
            {!embedded && nombreZona ? <> · {nombreZona}</> : null}
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-gray-300 hover:border-brand-chartreuse/40 hover:text-brand-chartreuse transition-colors cursor-pointer"
        >
          {expanded ? (
            <>
              <ChevronUp className="size-3.5" /> Compactar
            </>
          ) : (
            <>
              <ChevronDown className="size-3.5" /> Ver detalle
            </>
          )}
        </button>
      </div>

      {/* Banner de Empate Reglamentario / Requiere Sorteo */}
      {haySorteoPendiente && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle className="size-4 shrink-0 text-amber-400" />
            <span className="font-semibold">
              Empate técnico absoluto FAP en {nombreZona}. Requiere sorteo
              reglamentario para definir puestos{" "}
              {posicionesEnDisputa.map((p) => `${p}.º`).join(" y ")}.
            </span>
          </div>
          {puedeResolverSorteo && torneoId && (
            <button
              type="button"
              onClick={() => setModalSorteoOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              <Shuffle className="size-3 text-amber-300" />
              Resolver Sorteo
            </button>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 text-xs font-black text-brand-ayuda uppercase tracking-wider">
              <th className="py-2.5 px-3">Participantes / Pareja</th>
              <th className="py-2.5 px-2 text-center text-brand-chartreuse font-black">
                Pts
              </th>
              <th className="py-2.5 px-2 text-center">PJ</th>
              <th className="py-2.5 px-2 text-center text-green-400">PG</th>
              {expanded && (
                <>
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
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold text-gray-300">
            {stats.map((row, idx) => {
              const isClasificado =
                idx < cupoClasificacion && row.pj > 0 && !row.descalificada;
              const tieneSorteoResuelto = row.sorteo_posicion != null;

              return (
                <tr
                  key={row.inscripcionId}
                  className={`hover:bg-white/5 transition-colors ${
                    isClasificado ? "bg-brand-chartreuse/5" : ""
                  } ${row.cabezaDeSerie ? "bg-amber-500/5" : ""}`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`size-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                          row.cabezaDeSerie
                            ? "bg-amber-400 text-brand-black"
                            : idx === 0
                              ? "bg-brand-chartreuse text-brand-black"
                              : "bg-brand-input text-brand-ayuda"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex items-start gap-1.5 flex-wrap">
                        <PairDisplay
                          j1={row.jugador1_nombre}
                          j2={row.jugador2_nombre}
                          usuarioId={row.usuario_id}
                          usuario2Id={row.usuario2_id}
                          denominacion={row.denominacion_nacional}
                          provincia={row.provincia}
                          letra_prioridad={row.letra_prioridad}
                          alcanceNacional={nacional}
                          showAvatars={false}
                          variant="stacked"
                          compact
                        />
                        {row.descalificada && (
                          <span className="inline-flex shrink-0 text-xs font-black text-red-300 bg-red-400/10 border border-red-400/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-0.5">
                            Descalificada
                          </span>
                        )}
                        {row.cabezaDeSerie && (
                          <span className="inline-flex items-center gap-0.5 shrink-0 text-xs font-black text-amber-300 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-0.5">
                            <Star className="size-2.5 fill-amber-300" />
                            Cab. Serie
                          </span>
                        )}
                        {tieneSorteoResuelto && (
                          <span
                            title={row.sorteo_motivo || "Definido por sorteo reglamentario"}
                            className="inline-flex items-center gap-1 shrink-0 text-[10px] font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/25 px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-0.5"
                          >
                            <Shuffle className="size-2.5" />
                            Sorteo FAP
                          </span>
                        )}
                        {row.requiereSorteo && (
                          <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-black text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md uppercase tracking-wider mt-0.5">
                            <AlertTriangle className="size-2.5" />
                            Pendiente sorteo
                          </span>
                        )}
                        {isClasificado && (
                          <CheckCircle2 className="size-3.5 text-brand-chartreuse shrink-0 mt-1" />
                        )}
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
                  {expanded && (
                    <>
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
                      <td className="py-3 px-2 text-center text-brand-ayuda">
                        {row.stb}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Resolución de Sorteo */}
      {modalSorteoOpen && torneoId && (
        <ModalSorteoZona
          isOpen={modalSorteoOpen}
          onClose={() => setModalSorteoOpen(false)}
          torneoId={torneoId}
          nombreZona={nombreZona}
          parejasEmpatadas={parejasEnSorteo.map((p) => ({
            inscripcionId: p.inscripcionId,
            nombre: p.nombre,
            club: p.club,
            sorteoPosicion: p.sorteo_posicion,
          }))}
          posicionesEnDisputa={posicionesEnDisputa}
          onSuccess={() => {
            onSorteoResuelto?.();
          }}
        />
      )}
    </div>
  );
};
