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

export interface ParejaDrag {
  id: string; // inscripcion_id
  jugador1_nombre: string;
  jugador2_nombre: string | null;
  seed: number;
  club?: string;
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
    destinoZonaId: string
  ) => void;
  isEditing: boolean;
  partidos: Partido[];
}

export const SortablePareja = ({ 
  pareja, 
  isEditing,
  stats,
  isClassified,
  posNum,
}: { 
  pareja: ParejaDrag; 
  isEditing: boolean;
  stats: { played: number; won: number; points: number };
  isClassified?: boolean;
  posNum?: number;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pareja.id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const nombreCompleto = pareja.jugador1_nombre 
    ? (pareja.jugador2_nombre && pareja.jugador2_nombre !== "-" 
      ? `${pareja.jugador1_nombre} / ${pareja.jugador2_nombre}`
      : pareja.jugador1_nombre)
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
        <div 
          className="flex items-center justify-center text-gray-500 hover:text-white px-1 shrink-0"
        >
          <GripVertical className="size-4" />
        </div>
      )}

      <div className={`flex items-center justify-center size-7 rounded font-bold text-sm shrink-0 ${
        isClassified 
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
          : "bg-[#111111] text-brand-chartreuse"
      }`}>
        {isEditing ? (pareja.seed || "-") : (posNum || "-")}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <div className="text-[13px] font-black text-white uppercase truncate leading-tight tracking-wide">
            {nombreCompleto}
          </div>
          {isClassified && (
            <span className="shrink-0 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
              Pasa
            </span>
          )}
        </div>
        <div className="text-[11px] font-semibold text-gray-400 mt-0.5 truncate">
          {pareja.club || "Sin club asignado"}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0 px-2 text-xs">
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tight">PJ</span>
          <div className="flex items-center justify-center size-7 rounded bg-[#111111] text-white font-bold text-xs">
            {stats.played}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tight">PG</span>
          <div className="flex items-center justify-center size-7 rounded bg-[#111111] text-white font-bold text-xs">
            {stats.won}
          </div>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[8px] text-brand-chartreuse/60 font-bold uppercase tracking-tight">PTS</span>
          <div className="flex items-center justify-center size-7 rounded bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20 font-black text-xs">
            {stats.points}
          </div>
        </div>
      </div>
    </div>
  );
};

export const DroppableZona = ({
  zona,
  isEditing,
  partidos = [],
}: {
  zona: ZonaDrag;
  isEditing: boolean;
  partidos?: Partido[];
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

    partidos.forEach((p) => {
      if (p.ronda === zona.nombre && p.ganador) {
        if (p.equipo_a_id === inscripcionId || p.equipo_b_id === inscripcionId) {
          played++;
          
          const setA = p.set1_a || 0;
          const setB = p.set1_b || 0;
          
          if (p.equipo_a_id === inscripcionId) {
            diffSets += (setA - setB);
            diffGames += (setA - setB);
            gamesAFavor += setA;
            gamesEnContra += setB;
            if (p.ganador === inscripcionId) {
              won++;
              points += 2;
            } else {
              points += 1;
            }
          } else {
            diffSets += (setB - setA);
            diffGames += (setB - setA);
            gamesAFavor += setB;
            gamesEnContra += setA;
            if (p.ganador === inscripcionId) {
              won++;
              points += 2;
            } else {
              points += 1;
            }
          }
        }
      }
    });

    return { played, won, points, diffSets, diffGames, gamesAFavor, gamesEnContra };
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
              (p.equipo_a_id === b.id && p.equipo_b_id === a.id))
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
          if (a.stats.diffSets !== b.stats.diffSets) return b.stats.diffSets - a.stats.diffSets;
          if (a.stats.diffGames !== b.stats.diffGames) return b.stats.diffGames - a.stats.diffGames;
          if (a.stats.gamesAFavor !== b.stats.gamesAFavor) return b.stats.gamesAFavor - a.stats.gamesAFavor;
          if (a.stats.gamesEnContra !== b.stats.gamesEnContra) return a.stats.gamesEnContra - b.stats.gamesEnContra;
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
        <span className="px-3 py-1 bg-black/40 rounded-full text-[11px] font-bold text-gray-400 uppercase tracking-wide">
          Clasifican 2
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <SortableContext
          strategy={rectSortingStrategy}
          items={parejasConStats.map((p) => p.id)}
        >
          {parejasConStats.map((pareja, index) => {
            const isClassified = !isEditing && index < 2 && pareja.stats.played > 0;
            return (
              <SortablePareja
                key={pareja.id}
                pareja={pareja}
                isEditing={isEditing}
                stats={pareja.stats}
                isClassified={isClassified}
                posNum={index + 1}
              />
            );
          })}
        </SortableContext>
        
        {/* Placeholder for dropping new ones or empty state */}
        <div className="mt-2 flex items-center justify-center p-3 rounded-2xl border border-dashed border-brand-chartreuse/50 text-brand-chartreuse text-sm font-bold bg-brand-chartreuse/5">
          + Soltar aquí
        </div>
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
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
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
    if (!activeZona) return { played: 0, won: 0, points: 0 };
    
    let played = 0;
    let won = 0;
    let points = 0;

    partidos.forEach((p) => {
      if (p.ronda === activeZona.nombre && p.ganador) {
        if (p.equipo_a_id === id || p.equipo_b_id === id) {
          played++;
          if (p.ganador === id) {
            won++;
            points += 2;
          } else {
            points += 1;
          }
        }
      }
    });

    return { played, won, points };
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
    const overZona = findZonaOfPareja(overId) || zonas.find((z) => z.id === overId);

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
      })
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeZona = findZonaOfPareja(activeId);
    const overZona = findZonaOfPareja(overId) || zonas.find((z) => z.id === overId);

    if (activeZona && overZona && activeZona.id !== overZona.id) {
      // It moved across zones, trigger the onMove callback
      onMovePareja(activeId, activeZona.id, overZona.id);
    } else if (activeZona && activeZona.id === overZona?.id && activeId !== overId) {
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
        })
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {zonas.map((zona) => (
          <DroppableZona
            key={zona.id}
            zona={zona}
            isEditing={isEditing}
            partidos={partidos}
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
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
