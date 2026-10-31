"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  CheckSquare,
  Square,
  CalendarClock,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import type { BoardPartido, ProgramacionIssue } from "@/utils/services/torneos";

interface Props {
  partidos: BoardPartido[];
  issues: ProgramacionIssue[];
  readOnly?: boolean;
  activeDay?: string;
  diasDisponibles?: string[];
  onAsignarLote?: (partidoIds: string[], dia?: string) => Promise<void> | void;
  busy?: boolean;
}

function PendingCard({
  partido,
  issue,
  readOnly,
  selected,
  onToggleSelect,
}: {
  partido: BoardPartido;
  issue?: ProgramacionIssue;
  readOnly?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
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

  const meta = [
    partido.ronda_etiqueta || partido.ronda || "Partido",
    partido.orden != null ? `#${partido.orden}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const aviso =
    issue && issue.severity !== "ok" ? issue.message : null;
  const titulo = `${partido.label_a} vs ${partido.label_b}. ${meta}${
    aviso ? `. ${aviso}` : ""
  }`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={titulo}
      className={`prog-inset relative rounded-lg px-2 py-1 text-left transition-all ${
        partido.assigned ? "opacity-60" : ""
      } ${
        selected
          ? "border-brand-chartreuse/70 bg-brand-chartreuse/15 ring-1 ring-brand-chartreuse/40"
          : "hover:border-white/20"
      } ${
        !readOnly && !partido.assigned
          ? "cursor-grab active:cursor-grabbing"
          : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-2">
        {!readOnly && !partido.assigned && (
          <input
            type="checkbox"
            checked={Boolean(selected)}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Seleccionar partido ${partido.label_a} vs ${partido.label_b}`}
            className="size-3.5 rounded border-white/20 bg-black/50 text-brand-chartreuse accent-brand-chartreuse cursor-pointer shrink-0"
          />
        )}
        {!readOnly && !partido.assigned && (
          <GripVertical className="size-3.5 shrink-0 text-gray-500" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-none text-brand-white">
            {partido.label_a}{" "}
            <span className="font-normal text-gray-500">vs</span>{" "}
            {partido.label_b}
          </p>
          <p
            className={`mt-0.5 truncate text-[11px] leading-none ${
              issue?.severity === "bad"
                ? "text-red-300"
                : issue?.severity === "wait"
                  ? "text-amber-200"
                  : "text-gray-400"
            }`}
          >
            {meta}
            {aviso ? ` · ${aviso}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

export function PendingMatchesSidebar({
  partidos,
  issues,
  readOnly,
  activeDay,
  diasDisponibles = [],
  onAsignarLote,
  busy = false,
}: Props) {
  const [tab, setTab] = useState<"zones" | "bracket">("zones");
  const [mostrarAsignados, setMostrarAsignados] = useState(false);
  const [plegados, setPlegados] = useState<Record<string, boolean>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetDia, setTargetDia] = useState<string>("");

  useEffect(() => {
    if (activeDay) setTargetDia(activeDay);
  }, [activeDay]);

  // Al cambiar de tab, deseleccionar para no mezclar fases
  const handleTabChange = (nextTab: "zones" | "bracket") => {
    setTab(nextTab);
    setSelectedIds(new Set());
  };

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
    return [...map.entries()]
      .map(([ronda, list]) => {
        const ordenados = [...list].sort(
          (a, b) => (a.orden || 0) - (b.orden || 0),
        );
        return [ronda, ordenados] as const;
      })
      .sort((a, b) => {
        const oa = a[1][0]?.ronda_orden ?? 99;
        const ob = b[1][0]?.ronda_orden ?? 99;
        if (oa !== ob) return oa - ob;
        return a[0].localeCompare(b[0], "es");
      });
  }, [filtered]);

  const issueMap = useMemo(() => {
    const m = new Map<string, ProgramacionIssue>();
    for (const i of issues) m.set(i.partido_id, i);
    return m;
  }, [issues]);

  const phasePartidos = partidos.filter((p) => p.phase === tab);
  const unassignedPhase = phasePartidos.filter((p) => !p.assigned);
  const pendientes = unassignedPhase.length;

  const toggleGrupo = (clave: string) => {
    setPlegados((prev) => ({ ...prev, [clave]: !prev[clave] }));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPhase = () => {
    if (selectedIds.size === unassignedPhase.length && unassignedPhase.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(unassignedPhase.map((p) => p.id)));
    }
  };

  const toggleGroupSelect = (groupMatches: BoardPartido[], e: React.MouseEvent) => {
    e.stopPropagation();
    const unassignedGroup = groupMatches.filter((p) => !p.assigned);
    const allSelected =
      unassignedGroup.length > 0 &&
      unassignedGroup.every((p) => selectedIds.has(p.id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const p of unassignedGroup) next.delete(p.id);
      } else {
        for (const p of unassignedGroup) next.add(p.id);
      }
      return next;
    });
  };

  const handleAsignarLote = async () => {
    if (!onAsignarLote || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    await onAsignarLote(ids, targetDia || activeDay);
    setSelectedIds(new Set());
  };

  return (
    <aside
      ref={setNodeRef}
      title="Soltá un partido acá para quitarle el horario"
      className={`prog-surface flex h-full min-h-[280px] flex-col rounded-2xl lg:min-h-0 ${
        isOver
          ? "border-brand-chartreuse/60 ring-1 ring-brand-chartreuse/40"
          : "border-white/10"
      }`}
    >
      <div className="shrink-0 border-b border-white/10 px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-brand-white">Pendientes</h2>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">
              {pendientes} sin horario
            </p>
            {!readOnly && pendientes > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllPhase}
                className="text-[11px] font-bold text-brand-chartreuse hover:underline cursor-pointer"
              >
                {selectedIds.size === pendientes ? "Deseleccionar" : "Seleccionar todo"}
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="prog-inset flex min-w-0 flex-1 gap-1 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => handleTabChange("zones")}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold cursor-pointer ${
                tab === "zones"
                  ? "bg-brand-chartreuse text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Zonas
            </button>
            <button
              type="button"
              onClick={() => handleTabChange("bracket")}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold cursor-pointer ${
                tab === "bracket"
                  ? "bg-brand-chartreuse text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Llave
            </button>
          </div>
          <label
            title="Mostrar asignados"
            className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-gray-400"
          >
            <input
              type="checkbox"
              checked={mostrarAsignados}
              onChange={(e) => setMostrarAsignados(e.target.checked)}
              className="rounded border-white/20 bg-black/40"
            />
            Asignados
          </label>
        </div>
      </div>

      {/* BARRA DE ACCIÓN LOTE */}
      {selectedIds.size > 0 && (
        <div className="shrink-0 border-b border-white/10 bg-brand-chartreuse/10 p-2 text-xs">
          <div className="flex items-center justify-between gap-1 font-bold text-white mb-1.5">
            <span className="flex items-center gap-1.5 text-brand-chartreuse">
              <CheckSquare className="size-3.5" />
              {selectedIds.size} {selectedIds.size === 1 ? "partido seleccionado" : "partidos seleccionados"}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-[11px] text-gray-400 hover:text-white underline cursor-pointer"
            >
              Limpiar
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            {diasDisponibles.length > 1 && (
              <select
                value={targetDia || activeDay}
                onChange={(e) => setTargetDia(e.target.value)}
                title="Jornada destino"
                className="rounded-lg border border-white/20 bg-black/60 px-2 py-1 text-[11px] font-semibold text-white outline-none cursor-pointer"
              >
                {diasDisponibles.map((d) => (
                  <option key={d} value={d} className="bg-neutral-900">
                    {d}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              disabled={busy || readOnly}
              onClick={handleAsignarLote}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-chartreuse px-2.5 py-1.5 text-xs font-black text-brand-black hover:bg-[#b3e600] transition-colors cursor-pointer disabled:opacity-50"
            >
              <CalendarClock className="size-3.5" />
              Cargar en la grilla
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1">
        {groups.length === 0 ? (
          <p className="p-3 text-center text-xs text-gray-400">
            {pendientes === 0 && !mostrarAsignados
              ? "Todos tienen horario en esta fase."
              : "No hay partidos en esta fase."}
          </p>
        ) : (
          groups.map(([ronda, list]) => {
            const clave = `${tab}:${ronda}`;
            const plegado = plegados[clave] === true;
            const titulo = list[0]?.ronda_etiqueta || ronda;
            const unassignedInGroup = list.filter((p) => !p.assigned);
            const allInGroupSelected =
              unassignedInGroup.length > 0 &&
              unassignedInGroup.every((p) => selectedIds.has(p.id));

            return (
              <section key={clave} className="prog-inset rounded-lg">
                <div className="flex items-center justify-between px-2 py-0.5">
                  <button
                    type="button"
                    onClick={() => toggleGrupo(clave)}
                    aria-expanded={!plegado}
                    className="flex flex-1 cursor-pointer items-center gap-1.5 text-left text-xs font-bold text-gray-200 min-w-0"
                  >
                    <ChevronDown
                      className={`size-3.5 shrink-0 text-gray-400 transition-transform ${
                        plegado ? "-rotate-90" : ""
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate">{titulo}</span>
                    <span className="font-medium text-gray-400">{list.length}</span>
                  </button>

                  {!readOnly && unassignedInGroup.length > 0 && (
                    <button
                      type="button"
                      onClick={(e) => toggleGroupSelect(list, e)}
                      title={allInGroupSelected ? "Deseleccionar grupo" : "Seleccionar todo el grupo"}
                      className="ml-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-gray-400 hover:bg-white/10 hover:text-brand-chartreuse transition-colors cursor-pointer shrink-0"
                    >
                      {allInGroupSelected ? (
                        <CheckSquare className="size-3 text-brand-chartreuse" />
                      ) : (
                        <Square className="size-3" />
                      )}
                      <span>Todo</span>
                    </button>
                  )}
                </div>

                {plegado ? null : (
                  <div className="space-y-0.5 px-1 pb-1">
                    {list.map((p) => (
                      <PendingCard
                        key={p.id}
                        partido={p}
                        issue={issueMap.get(p.id)}
                        readOnly={readOnly}
                        selected={selectedIds.has(p.id)}
                        onToggleSelect={() => toggleSelect(p.id)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
