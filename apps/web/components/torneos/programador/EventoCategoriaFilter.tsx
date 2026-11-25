"use client";

import { useMemo } from "react";
import { colorCategoriaEvento } from "@/utils/eventoCategoriaColores";
import type { ProgramacionBoardEvento } from "@/utils/services/torneos";

interface Props {
  board: ProgramacionBoardEvento;
  filtroTorneoId: string | null;
  onFiltroChange: (torneoId: string | null) => void;
  ordenAutoIds: string[];
  onOrdenAutoChange: (ids: string[]) => void;
}

function etiquetaTorneo(
  t: ProgramacionBoardEvento["torneos"][number],
): string {
  const parts = [t.nivel, t.rama].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return t.nombre;
}

export function EventoCategoriaFilter({
  board,
  filtroTorneoId,
  onFiltroChange,
  ordenAutoIds,
  onOrdenAutoChange,
}: Props) {
  const torneoIds = useMemo(
    () => board.torneos.map((t) => t.id),
    [board.torneos],
  );

  const orden = ordenAutoIds.length
    ? [
        ...ordenAutoIds.filter((id) => torneoIds.includes(id)),
        ...torneoIds.filter((id) => !ordenAutoIds.includes(id)),
      ]
    : torneoIds;

  const subirPrioridad = (torneoId: string) => {
    const rest = orden.filter((id) => id !== torneoId);
    onOrdenAutoChange([torneoId, ...rest]);
  };

  return (
    <section
      className="prog-surface flex flex-col gap-2 rounded-xl border border-white/10 px-3 py-2"
      aria-label="Categorías del evento"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-300">
          Categorías del evento
          {board.evento_nombre ? (
            <span className="font-normal text-gray-500">
              {" "}
              · {board.evento_nombre}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => onFiltroChange(null)}
          className={`text-[11px] font-semibold underline-offset-2 hover:underline ${
            filtroTorneoId == null
              ? "text-brand-chartreuse"
              : "text-gray-400 cursor-pointer"
          }`}
        >
          Ver todas
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {orden.map((id) => {
          const t = board.torneos.find((x) => x.id === id);
          if (!t) return null;
          const color = colorCategoriaEvento(id, torneoIds);
          const activo = filtroTorneoId === id;
          const etiqueta = etiquetaTorneo(t);
          return (
            <div
              key={id}
              className={`inline-flex items-stretch overflow-hidden rounded-lg border text-left ${
                activo ? "border-white/40 ring-1 ring-white/20" : "border-white/10"
              }`}
            >
              <button
                type="button"
                onClick={() => onFiltroChange(activo ? null : id)}
                className="inline-flex min-w-0 items-center gap-2 px-2.5 py-1.5 text-xs font-semibold cursor-pointer hover:bg-white/5"
                title={
                  t.programacion_estado
                    ? `Estado: ${t.programacion_estado}`
                    : undefined
                }
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="truncate max-w-[140px] sm:max-w-[200px]">
                  {etiqueta}
                </span>
              </button>
              <button
                type="button"
                onClick={() => subirPrioridad(id)}
                className="border-l border-white/10 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:bg-white/5 hover:text-brand-chartreuse cursor-pointer"
                title="Priorizar en auto-asignación"
              >
                1º
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500">
        El color coincide con la grilla y pendientes. «1º» define el orden del
        auto-asignar entre categorías.
      </p>
    </section>
  );
}