"use client";

import { useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { colorCategoriaEvento } from "@/utils/eventoCategoriaColores";
import type { ProgramacionBoardEvento } from "@/utils/services/torneos";

interface Props {
  board: ProgramacionBoardEvento;
  filtroTorneoId: string | null;
  onFiltroChange: (torneoId: string | null) => void;
  filtroClubId: string | null;
  onFiltroClubChange: (clubId: string | null) => void;
  ordenAutoIds: string[];
  onOrdenAutoChange: (ids: string[]) => void;
  disabled?: boolean;
}

function etiquetaTorneo(
  t: ProgramacionBoardEvento["torneos"][number],
): string {
  const parts = [t.nivel, t.rama].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return t.nombre;
}

function etiquetaPrioridad(posicion: number): string {
  return `${posicion}º`;
}

export function EventoCategoriaFilter({
  board,
  filtroTorneoId,
  onFiltroChange,
  filtroClubId,
  onFiltroClubChange,
  ordenAutoIds,
  onOrdenAutoChange,
  disabled = false,
}: Props) {
  const torneoIds = useMemo(
    () => board.torneos.map((t) => t.id),
    [board.torneos],
  );

  const sedes = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of board.canchas) {
      if (!c.club_id) continue;
      const nombre = c.club?.trim() || c.club_id;
      if (!map.has(c.club_id)) map.set(c.club_id, nombre);
    }
    return [...map.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [board.canchas]);

  const orden = ordenAutoIds.length
    ? [
        ...ordenAutoIds.filter((id) => torneoIds.includes(id)),
        ...torneoIds.filter((id) => !ordenAutoIds.includes(id)),
      ]
    : torneoIds;

  const mover = (torneoId: string, delta: -1 | 1) => {
    const idx = orden.indexOf(torneoId);
    if (idx < 0) return;
    const next = idx + delta;
    if (next < 0 || next >= orden.length) return;
    const copia = [...orden];
    const tmp = copia[idx];
    copia[idx] = copia[next];
    copia[next] = tmp;
    onOrdenAutoChange(copia);
  };

  return (
    <section
      className="prog-surface flex flex-col gap-2 rounded-xl border border-white/10 px-3 py-2"
      aria-label="Categorías del evento"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-300">Categorías del evento</p>
        <div className="flex flex-wrap items-center gap-3">
          {sedes.length > 1 ? (
            <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <span className="font-semibold text-gray-500">Sede</span>
              <select
                value={filtroClubId ?? ""}
                onChange={(e) =>
                  onFiltroClubChange(e.target.value ? e.target.value : null)
                }
                className="prog-ghost max-w-[200px] cursor-pointer rounded-lg border border-white/10 bg-transparent px-2 py-1 text-[11px] font-semibold text-brand-white"
                aria-label="Filtrar grilla por sede"
              >
                <option value="">Todas las sedes</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
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
      </div>
      <div className="flex flex-wrap gap-2">
        {orden.map((id, index) => {
          const t = board.torneos.find((x) => x.id === id);
          if (!t) return null;
          const color = colorCategoriaEvento(id, torneoIds);
          const activo = filtroTorneoId === id;
          const etiqueta = etiquetaTorneo(t);
          const puedeSubir = index > 0 && !disabled;
          const puedeBajar = index < orden.length - 1 && !disabled;
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
              <span
                className="flex items-center border-l border-white/10 px-2 py-1.5 text-[10px] font-bold tabular-nums text-gray-300"
                title="Prioridad en auto-asignación del evento"
              >
                {etiquetaPrioridad(index + 1)}
              </span>
              <button
                type="button"
                disabled={!puedeSubir}
                onClick={() => mover(id, -1)}
                className="border-l border-white/10 px-1.5 py-1.5 text-gray-400 hover:bg-white/5 hover:text-brand-chartreuse disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
                title="Subir prioridad"
                aria-label={`Subir prioridad de ${etiqueta}`}
              >
                <ChevronUp className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                disabled={!puedeBajar}
                onClick={() => mover(id, 1)}
                className="border-l border-white/10 px-1.5 py-1.5 text-gray-400 hover:bg-white/5 hover:text-brand-chartreuse disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer disabled:cursor-not-allowed"
                title="Bajar prioridad"
                aria-label={`Bajar prioridad de ${etiqueta}`}
              >
                <ChevronDown className="size-3.5" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500">
        El color coincide con la grilla y pendientes. Al filtrar una categoría,
        las celdas de otras se muestran atenuadas. El número es la prioridad del
        auto-asignar entre categorías (zonas en bloque, luego llaves).
      </p>
    </section>
  );
}