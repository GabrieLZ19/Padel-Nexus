"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useMemo, useState } from "react";
import type { BoardPartido, ProgramacionIssue } from "@/utils/services/torneos";

interface Props {
  partidos: BoardPartido[];
  issues: ProgramacionIssue[];
  readOnly?: boolean;
}

function PendingCard({
  partido,
  issue,
  readOnly,
}: {
  partido: BoardPartido;
  issue?: ProgramacionIssue;
  readOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `pending-${partido.id}`,
      data: { type: "pending", partido },
      disabled: readOnly || partido.assigned,
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 text-left ${
        !readOnly && !partido.assigned
          ? "cursor-grab active:cursor-grabbing"
          : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-1.5">
        {!readOnly && !partido.assigned && (
          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-gray-500" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-brand-chartreuse/80">
            {partido.ronda || "Partido"}
            {partido.orden != null ? ` · #${partido.orden}` : ""}
          </p>
          <p className="mt-0.5 text-xs font-medium text-white leading-snug line-clamp-2">
            {partido.label_a}
          </p>
          <p className="text-[10px] text-gray-500">vs</p>
          <p className="text-xs font-medium text-white leading-snug line-clamp-2">
            {partido.label_b}
          </p>
          {issue && issue.severity !== "ok" && (
            <p
              className={`mt-1 text-[10px] ${
                issue.severity === "bad" ? "text-red-400" : "text-amber-300"
              }`}
            >
              {issue.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function PendingMatchesSidebar({ partidos, issues, readOnly }: Props) {
  const [tab, setTab] = useState<"zones" | "bracket">("zones");
  const [mostrarAsignados, setMostrarAsignados] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id: "pending-tray",
    data: { type: "pending-tray" },
    disabled: readOnly,
  });

  const filtered = useMemo(() => {
    const byPhase = partidos.filter((p) => p.phase === tab);
    if (mostrarAsignados) return byPhase;
    return byPhase.filter((p) => !p.assigned);
  }, [partidos, tab, mostrarAsignados]);

  const groups = useMemo(() => {
    const map = new Map<string, BoardPartido[]>();
    for (const p of filtered) {
      const key = p.ronda || "Otros";
      const list = map.get(key) || [];
      list.push(p);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const issueMap = useMemo(() => {
    const m = new Map<string, ProgramacionIssue>();
    for (const i of issues) m.set(i.partido_id, i);
    return m;
  }, [issues]);

  const phasePartidos = partidos.filter((p) => p.phase === tab);
  const pendientes = phasePartidos.filter((p) => !p.assigned).length;

  return (
    <aside
      ref={setNodeRef}
      className={`flex h-full min-h-0 flex-col rounded-2xl border bg-[#161616] ${
        isOver
          ? "border-brand-chartreuse/60 ring-1 ring-brand-chartreuse/40"
          : "border-white/10"
      }`}
    >
      <div className="border-b border-white/10 p-3">
        <h2 className="text-sm font-bold text-white">Pendientes</h2>
        <p className="text-xs text-gray-500">
          {pendientes} sin horario · soltá aquí para desasignar
        </p>
        <div className="mt-2 flex gap-1 rounded-lg bg-black/30 p-1">
          <button
            type="button"
            onClick={() => setTab("zones")}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold cursor-pointer ${
              tab === "zones"
                ? "bg-brand-chartreuse text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Zonas
          </button>
          <button
            type="button"
            onClick={() => setTab("bracket")}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold cursor-pointer ${
              tab === "bracket"
                ? "bg-brand-chartreuse text-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Llave
          </button>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-[11px] text-gray-400">
          <input
            type="checkbox"
            checked={mostrarAsignados}
            onChange={(e) => setMostrarAsignados(e.target.checked)}
            className="rounded border-white/20 bg-black/40"
          />
          Mostrar asignados
        </label>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {groups.length === 0 ? (
          <p className="p-3 text-center text-xs text-gray-500">
            {pendientes === 0 && !mostrarAsignados
              ? "Todos tienen horario en esta fase."
              : "No hay partidos en esta fase."}
          </p>
        ) : (
          groups.map(([ronda, list]) => (
            <details key={ronda} open className="group rounded-xl bg-black/20">
              <summary className="cursor-pointer list-none px-2.5 py-2 text-xs font-bold text-gray-300 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-2">
                  <span>{ronda}</span>
                  <span className="text-[10px] font-medium text-gray-500">
                    {list.length}
                  </span>
                </span>
              </summary>
              <div className="space-y-1.5 px-1.5 pb-2">
                {list.map((p) => (
                  <PendingCard
                    key={p.id}
                    partido={p}
                    issue={issueMap.get(p.id)}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </aside>
  );
}
