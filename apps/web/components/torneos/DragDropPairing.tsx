"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { MatchCard } from "./MatchCard";
import { Partido } from "@/utils/types";

const cleanName = (name?: string | null) => {
  if (!name) return "";
  let cleaned = name
    .trim()
    .replace(/^[\s,.\-]+/, "") // remove leading spaces, commas, dots, dashes
    .replace(/[\s,.\-]+$/, ""); // remove trailing spaces, commas, dots, dashes
  if (cleaned === "," || cleaned === "." || cleaned === "") return "";
  return cleaned;
};

const getClasificanTexto = (totalZonas: number) => {
  if (totalZonas <= 0) return "Clasifican 2";
  if (totalZonas === 1) return "Clasifican 2";
  if (totalZonas === 2) return "Clasifican 2 por zona";
  if (totalZonas === 3) return "Clasifica 1 por zona + 1 mejor 2º";
  if (totalZonas === 4) return "Clasifican 2 por zona";
  if (totalZonas === 5) return "Clasifica 1 por zona + 3 mejores 2º";
  if (totalZonas === 6) return "Clasifica 1 por zona + 2 mejores 2º";
  if (totalZonas === 7) return "Clasifica 1 por zona + 9 mejores 2º";
  if (totalZonas === 8) return "Clasifican 2 por zona";
  return "Clasifican 2 por zona";
};

const getLimiteClasificadosDirectos = (totalZonas: number) => {
  if (
    totalZonas === 3 ||
    totalZonas === 5 ||
    totalZonas === 6 ||
    totalZonas === 7
  ) {
    return 1;
  }
  return 2;
};

export interface ParejaDrag {
  id: string; // inscripcion_id
  jugador1_nombre: string;
  jugador2_nombre: string | null;
  seed: number;
  club?: string;
  cabezaDeSerie?: boolean;
}

export interface ZonaDrag {
  id: string; // grupo_id
  nombre: string;
  parejas: ParejaDrag[];
}

interface DragDropPairingProps {
  zonas: ZonaDrag[];
  onZonasChange: (zonas: ZonaDrag[]) => void;
  onMovePareja: (
    inscripcionId: string,
    origenZonaId: string,
    destinoZonaId: string,
  ) => void;
  isEditing: boolean;
  partidos: Partido[];
  isSiembra?: boolean;
}

export const SortablePareja = ({
  pareja,
  isEditing,
  stats,
  isClassified,
  posNum,
  isSiembra = false,
}: {
  pareja: ParejaDrag;
  isEditing: boolean;
  stats: {
    played: number;
    won: number;
    points: number;
    diffSets: number;
    diffGames: number;
  };
  isClassified?: boolean;
  posNum?: number;
  isSiembra?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pareja.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const j1 = cleanName(pareja.jugador1_nombre);
  const j2 = cleanName(pareja.jugador2_nombre);
  const nombreCompleto = j1
    ? j2 && j2 !== "-"
      ? `${j1} / ${j2}`
      : j1
    : "DESCONOCIDO";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditing ? attributes : {})}
      {...(isEditing ? listeners : {})}
      className={`relative flex items-center gap-3 p-3 rounded-2xl transition-all group shadow-md select-none border-2 ${
        isEditing
          ? "bg-[#222222] border-transparent hover:border-brand-chartreuse/50 cursor-grab active:cursor-grabbing"
          : isClassified
            ? "bg-emerald-950/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
            : "bg-[#222222] border-white/5"
      }`}
    >
      {isEditing && (
        <div className="flex items-center justify-center text-gray-500 hover:text-white px-1 shrink-0">
          <GripVertical className="size-4" />
        </div>
      )}

      <div
        className={`flex items-center justify-center size-7 rounded font-bold text-sm shrink-0 ${
          isClassified
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            : "bg-[#111111] text-brand-chartreuse"
        }`}
      >
        {isEditing ? pareja.seed || "-" : posNum || "-"}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="text-[11.5px] font-black text-white uppercase leading-snug tracking-wide wrap-break-word break-all">
            {nombreCompleto}
          </div>
          {pareja.cabezaDeSerie && (
            <span className="shrink-0 text-[8px] font-black text-[#ccff00] bg-[#ccff00]/10 border border-[#ccff00]/20 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
              Cab. Serie
            </span>
          )}
          {isClassified && (
            <span className="shrink-0 text-[8px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Pasa
            </span>
          )}
        </div>
        <div className="text-[10px] font-semibold text-gray-400 mt-1 truncate">
          {pareja.club || "Sin club asignado"}
        </div>
      </div>

      {!isSiembra && (
        <div className="flex items-center gap-2 shrink-0 px-1 text-xs">
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-gray-500 font-bold uppercase tracking-tight">
              PJ
            </span>
            <div className="flex items-center justify-center size-6 rounded bg-[#111111] text-white font-bold text-[10px]">
              {stats.played}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-gray-500 font-bold uppercase tracking-tight">
              PG
            </span>
            <div className="flex items-center justify-center size-6 rounded bg-[#111111] text-white font-bold text-[10px]">
              {stats.won}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-gray-500 font-bold uppercase tracking-tight">
              DS
            </span>
            <div
              className={`flex items-center justify-center size-6 rounded bg-[#111111] font-bold text-[10px] ${stats.diffSets > 0 ? "text-emerald-400" : stats.diffSets < 0 ? "text-red-400" : "text-white"}`}
            >
              {stats.diffSets > 0 ? `+${stats.diffSets}` : stats.diffSets}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-gray-500 font-bold uppercase tracking-tight">
              DG
            </span>
            <div
              className={`flex items-center justify-center size-6 rounded bg-[#111111] font-bold text-[10px] ${stats.diffGames > 0 ? "text-emerald-400" : stats.diffGames < 0 ? "text-red-400" : "text-white"}`}
            >
              {stats.diffGames > 0 ? `+${stats.diffGames}` : stats.diffGames}
            </div>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] text-brand-chartreuse/60 font-bold uppercase tracking-tight">
              PTS
            </span>
            <div className="flex items-center justify-center size-6 rounded bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/25 font-black text-[10px]">
              {stats.points}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DroppableZona = ({
  zona,
  isEditing,
  partidos = [],
  totalZonas = 4,
  isSiembra = false,
}: {
  zona: ZonaDrag;
  isEditing: boolean;
  partidos?: Partido[];
  totalZonas?: number;
  isSiembra?: boolean;
}) => {
  const { setNodeRef } = useDroppable({
    id: zona.id,
    disabled: !isEditing,
  });

  // Calcular estadísticas de victorias/puntos FAP (incluye desempates)
  const getStats = (inscripcionId: string) => {
    let played = 0;
    let won = 0;
    let points = 0;
    let diffSets = 0;
    let diffGames = 0;
    let gamesAFavor = 0;
    let gamesEnContra = 0;

    partidos.forEach((p: any) => {
      if (p.ronda === zona.nombre && p.ganador) {
        const isTeamA = p.equipo_a_id === inscripcionId;
        const isTeamB = p.equipo_b_id === inscripcionId;
        if (isTeamA || isTeamB) {
          played++;

          if (p.es_wo) {
            if (p.ganador === inscripcionId) {
              won++;
              points += 2;
              diffSets += 2;
              gamesAFavor += 12;
            } else {
              diffSets -= 2;
              gamesEnContra += 12;
              points += 0;
            }
            return;
          }

          let sA_w = 0;
          let sA_l = 0;
          let gA_w = 0;
          let gA_l = 0;

          // Set 1
          if (p.set1_a !== null && p.set1_b !== null) {
            const aWon = p.set1_a > p.set1_b;
            if (isTeamA) {
              if (aWon) sA_w++;
              else sA_l++;
              gA_w += p.set1_a;
              gA_l += p.set1_b;
            } else {
              if (!aWon) sA_w++;
              else sA_l++;
              gA_w += p.set1_b;
              gA_l += p.set1_a;
            }
          }

          // Set 2
          if (p.set2_a !== null && p.set2_b !== null) {
            const aWon = p.set2_a > p.set2_b;
            if (isTeamA) {
              if (aWon) sA_w++;
              else sA_l++;
              gA_w += p.set2_a;
              gA_l += p.set2_b;
            } else {
              if (!aWon) sA_w++;
              else sA_l++;
              gA_w += p.set2_b;
              gA_l += p.set2_a;
            }
          }

          // Set 3 o Supertiebreak
          if (p.set3_a !== null && p.set3_b !== null) {
            const aWon = p.set3_a > p.set3_b;
            if (isTeamA) {
              if (aWon) sA_w++;
              else sA_l++;
              if (!p.es_supertiebreak) {
                gA_w += p.set3_a;
                gA_l += p.set3_b;
              }
            } else {
              if (!aWon) sA_w++;
              else sA_l++;
              if (!p.es_supertiebreak) {
                gA_w += p.set3_b;
                gA_l += p.set3_a;
              }
            }
          }

          diffSets += sA_w - sA_l;
          diffGames += gA_w - gA_l;
          gamesAFavor += gA_w;
          gamesEnContra += gA_l;

          if (p.ganador === inscripcionId) {
            won++;
            points += 2;
          } else {
            points += 1;
          }
        }
      }
    });

    return {
      played,
      won,
      points,
      diffSets,
      diffGames,
      gamesAFavor,
      gamesEnContra,
    };
  };

  // Asignar estadísticas
  let parejasConStats = (zona.parejas || []).map((p) => ({
    ...p,
    stats: getStats(p.id),
  }));

  if (!isEditing) {
    // Ordenar posiciones por reglas oficiales FAP
    const groups: Record<number, typeof parejasConStats> = {};
    parejasConStats.forEach((team) => {
      const pts = team.stats.points;
      if (!groups[pts]) groups[pts] = [];
      groups[pts].push(team);
    });

    const sortedPoints = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);

    const sortedList: typeof parejasConStats = [];

    for (const pts of sortedPoints) {
      const tiedTeams = groups[pts];
      if (tiedTeams.length === 2) {
        const a = tiedTeams[0];
        const b = tiedTeams[1];
        const partidoDirecto = partidos.find(
          (p) =>
            p.ronda === zona.nombre &&
            p.ganador &&
            ((p.equipo_a_id === a.id && p.equipo_b_id === b.id) ||
              (p.equipo_a_id === b.id && p.equipo_b_id === a.id)),
        );
        if (partidoDirecto && partidoDirecto.ganador) {
          if (partidoDirecto.ganador === a.id) {
            sortedList.push(a, b);
          } else {
            sortedList.push(b, a);
          }
        } else {
          sortedList.push(a, b);
        }
      } else if (tiedTeams.length >= 3) {
        tiedTeams.sort((a, b) => {
          if (a.stats.diffSets !== b.stats.diffSets)
            return b.stats.diffSets - a.stats.diffSets;
          if (a.stats.diffGames !== b.stats.diffGames)
            return b.stats.diffGames - a.stats.diffGames;
          if (a.stats.gamesAFavor !== b.stats.gamesAFavor)
            return b.stats.gamesAFavor - a.stats.gamesAFavor;
          if (a.stats.gamesEnContra !== b.stats.gamesEnContra)
            return a.stats.gamesEnContra - b.stats.gamesEnContra;
          return 0;
        });
        sortedList.push(...tiedTeams);
      } else {
        sortedList.push(...tiedTeams);
      }
    }
    parejasConStats = sortedList;
  }

  return (
    <div
      ref={setNodeRef}
      className="bg-[#2a2a2a] rounded-3xl p-4 flex flex-col h-full min-h-[300px] border border-white/5 shadow-xl"
    >
      <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
        <h4 className="text-white font-black uppercase tracking-widest text-lg">
          {zona.nombre}
        </h4>
        {!isSiembra && (
          <span className="px-3 py-1 bg-black/40 rounded-full text-[10px] font-bold text-gray-400 uppercase tracking-wide">
            {getClasificanTexto(totalZonas)}
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <SortableContext
          strategy={rectSortingStrategy}
          items={parejasConStats.map((p) => p.id)}
        >
          {parejasConStats.map((pareja, index) => {
            const isClassified =
              !isEditing &&
              index < getLimiteClasificadosDirectos(totalZonas) &&
              pareja.stats.played > 0;
            return (
              <SortablePareja
                key={pareja.id}
                pareja={pareja}
                isEditing={isEditing}
                stats={pareja.stats}
                isClassified={isClassified}
                posNum={index + 1}
                isSiembra={isSiembra}
              />
            );
          })}
        </SortableContext>

        {/* Placeholder for dropping new ones or empty state */}
        {(!isSiembra || (isSiembra && zona.parejas.length < 2)) && (
          <div className="mt-2 flex items-center justify-center p-3 rounded-2xl border border-dashed border-brand-chartreuse/50 text-brand-chartreuse text-sm font-bold bg-brand-chartreuse/5">
            + Soltar aquí
          </div>
        )}
      </div>
    </div>
  );
};

export const DragDropPairing: React.FC<DragDropPairingProps> = ({
  zonas,
  onZonasChange,
  onMovePareja,
  isEditing,
  partidos = [],
  isSiembra = false,
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const findZonaOfPareja = (id: string) => {
    return zonas.find((z) => z.parejas.some((p) => p.id === id));
  };

  const getParejaById = (id: string) => {
    for (const z of zonas) {
      const p = z.parejas.find((par) => par.id === id);
      if (p) return p;
    }
    return null;
  };

  const getParejaStatsById = (id: string) => {
    const activeZona = findZonaOfPareja(id);
    if (!activeZona) return { played: 0, won: 0, points: 0, diffSets: 0, diffGames: 0 };

    let played = 0;
    let won = 0;
    let points = 0;
    let diffSets = 0;
    let diffGames = 0;

    partidos.forEach((p: any) => {
      if (p.ronda === activeZona.nombre && p.ganador) {
        const isTeamA = p.equipo_a_id === id;
        const isTeamB = p.equipo_b_id === id;
        if (isTeamA || isTeamB) {
          played++;
          
          if (p.es_wo) {
            if (p.ganador === id) {
              won++;
              points += 2;
              diffSets += 2;
            } else {
              diffSets -= 2;
              points += 0;
            }
            return;
          }

          let sA_w = 0;
          let sA_l = 0;
          let gA_w = 0;
          let gA_l = 0;

          if (p.set1_a !== null && p.set1_b !== null) {
            const aWon = p.set1_a > p.set1_b;
            if (isTeamA) {
              if (aWon) sA_w++; else sA_l++;
              gA_w += p.set1_a;
              gA_l += p.set1_b;
            } else {
              if (!aWon) sA_w++; else sA_l++;
              gA_w += p.set1_b;
              gA_l += p.set1_a;
            }
          }

          if (p.set2_a !== null && p.set2_b !== null) {
            const aWon = p.set2_a > p.set2_b;
            if (isTeamA) {
              if (aWon) sA_w++; else sA_l++;
              gA_w += p.set2_a;
              gA_l += p.set2_b;
            } else {
              if (!aWon) sA_w++; else sA_l++;
              gA_w += p.set2_b;
              gA_l += p.set2_a;
            }
          }

          if (p.set3_a !== null && p.set3_b !== null) {
            const aWon = p.set3_a > p.set3_b;
            if (isTeamA) {
              if (aWon) sA_w++; else sA_l++;
              if (!p.es_supertiebreak) {
                gA_w += p.set3_a;
                gA_l += p.set3_b;
              }
            } else {
              if (!aWon) sA_w++; else sA_l++;
              if (!p.es_supertiebreak) {
                gA_w += p.set3_b;
                gA_l += p.set3_a;
              }
            }
          }

          diffSets += (sA_w - sA_l);
          diffGames += (gA_w - gA_l);

          if (p.ganador === id) {
            won++;
            points += 2;
          } else {
            points += 1;
          }
        }
      }
    });

    return { played, won, points, diffSets, diffGames };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    if (activeId === overId) return;

    const activeZona = findZonaOfPareja(activeId);
    const overZona =
      findZonaOfPareja(overId) || zonas.find((z) => z.id === overId);

    if (!activeZona || !overZona || activeZona.id === overZona.id) return;

    onZonasChange(
      zonas.map((z) => {
        if (z.id === activeZona.id) {
          return {
            ...z,
            parejas: z.parejas.filter((p) => p.id !== activeId),
          };
        }
        if (z.id === overZona.id) {
          const activePareja = getParejaById(activeId);
          if (!activePareja) return z;

          const overIndex = z.parejas.findIndex((p) => p.id === overId);
          const newParejas = [...z.parejas];
          if (overIndex >= 0) {
            newParejas.splice(overIndex, 0, activePareja);
          } else {
            newParejas.push(activePareja);
          }
          return { ...z, parejas: newParejas };
        }
        return z;
      }),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeZona = findZonaOfPareja(activeId);
    const overZona =
      findZonaOfPareja(overId) || zonas.find((z) => z.id === overId);

    if (activeZona && overZona && activeZona.id !== overZona.id) {
      // It moved across zones, trigger the onMove callback
      onMovePareja(activeId, activeZona.id, overZona.id);
    } else if (
      activeZona &&
      activeZona.id === overZona?.id &&
      activeId !== overId
    ) {
      // Reordered in the same zone
      const oldIndex = activeZona.parejas.findIndex((p) => p.id === activeId);
      const newIndex = activeZona.parejas.findIndex((p) => p.id === overId);

      onZonasChange(
        zonas.map((z) => {
          if (z.id === activeZona.id) {
            return {
              ...z,
              parejas: arrayMove(z.parejas, oldIndex, newIndex),
            };
          }
          return z;
        }),
      );
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {zonas.map((zona) => (
          <DroppableZona
            key={zona.id}
            zona={zona}
            isEditing={isEditing}
            partidos={partidos}
            totalZonas={zonas.length}
            isSiembra={isSiembra}
          />
        ))}
      </div>

      <DragOverlay>
        {activeId && getParejaById(activeId) ? (
          <div className="opacity-90 scale-105 shadow-2xl">
            <SortablePareja
              pareja={getParejaById(activeId)!}
              isEditing={true}
              stats={getParejaStatsById(activeId)}
              isSiembra={isSiembra}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
