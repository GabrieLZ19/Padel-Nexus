"use client";

import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
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
}

export const SortablePareja = ({ pareja, isEditing }: { pareja: ParejaDrag; isEditing: boolean }) => {
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
      className={`relative flex items-center gap-3 p-3 rounded-2xl bg-[#222222] ${
        isEditing
          ? "hover:border-brand-chartreuse/50 cursor-grab active:cursor-grabbing border-transparent"
          : "border-transparent"
      } border-2 transition-colors group shadow-md`}
    >
      <div 
        {...attributes}
        {...listeners}
        className="flex items-center justify-center text-gray-500 hover:text-white px-1"
      >
        <GripVertical className="size-4" />
      </div>

      <div className="flex items-center justify-center size-7 rounded bg-[#111111] text-brand-chartreuse font-bold text-sm shrink-0">
        {pareja.seed || "-"}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-black text-white uppercase truncate leading-tight tracking-wide">
          {nombreCompleto}
        </div>
        <div className="text-[11px] font-semibold text-gray-400 mt-0.5 truncate">
          {pareja.club || "Club Pilar"}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 px-2">
        <div className="flex items-center justify-center size-7 rounded bg-[#111111] text-white font-bold text-sm">
          -
        </div>
        <div className="flex items-center justify-center size-7 rounded bg-[#111111] text-white font-bold text-sm">
          -
        </div>
      </div>
    </div>
  );
};

export const DroppableZona = ({
  zona,
  isEditing,
}: {
  zona: ZonaDrag;
  isEditing: boolean;
}) => {
  return (
    <div className="bg-[#2a2a2a] rounded-3xl p-4 flex flex-col h-full min-h-[300px] border border-white/5 shadow-xl">
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
          items={zona.parejas.map((p) => p.id)}
          strategy={rectSortingStrategy}
        >
          {zona.parejas.map((pareja) => (
            <SortablePareja key={pareja.id} pareja={pareja} isEditing={isEditing} />
          ))}
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
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
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
          <DroppableZona key={zona.id} zona={zona} isEditing={isEditing} />
        ))}
      </div>

      <DragOverlay>
        {activeId && getParejaById(activeId) ? (
          <div className="opacity-90 scale-105 shadow-2xl">
            <SortablePareja pareja={getParejaById(activeId)!} isEditing={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
