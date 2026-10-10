"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, GripVertical } from "lucide-react";
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
      className={`rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-left ${
        partido.assigned ? "opacity-60" : ""
      } ${
        !readOnly && !partido.assigned
          ? "cursor-grab active:cursor-grabbing"
          : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-center gap-1.5">
        {!readOnly && !partido.assigned && (
          <GripVertical className="size-3.5 shrink-0 text-gray-500" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold leading-none text-white">
            {partido.label_a}{" "}
            <span className="font-normal text-gray-500">vs</span>{" "}
            {partido.label_b}
          </p>
          <p
            className={`mt-0.5 truncate text-xs leading-none ${
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

export function PendingMatchesSidebar({ partidos, issues, readOnly }: Props) {
  const [tab, setTab] = useState<"zones" | "bracket">("zones");
  const [mostrarAsignados, setMostrarAsignados] = useState(false);
  const [plegados, setPlegados] = useState<Record<string, boolean>>({});
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
  const pendientes = phasePartidos.filter((p) => !p.assigned).length;

  const toggleGrupo = (clave: string) => {
    setPlegados((prev) => ({ ...prev, [clave]: !prev[clave] }));
  };

  return (
    <aside
      ref={setNodeRef}
      title="Soltá un partido acá para quitarle el horario"
      className={`flex h-full min-h-0 flex-col rounded-2xl border bg-[#161616] ${
        isOver
          ? "border-brand-chartreuse/60 ring-1 ring-brand-chartreuse/40"
          : "border-white/10"
      }`}
    >
      <div className="shrink-0 border-b border-white/10 px-2 py-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-white">Pendientes</h2>
          <p className="text-xs text-gray-400">
            {pendientes} sin horario
          </p>
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <div className="flex min-w-0 flex-1 gap-1 rounded-lg bg-black/30 p-0.5">
            <button
              type="button"
              onClick={() => setTab("zones")}
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
              onClick={() => setTab("bracket")}
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
            return (
              <section key={clave} className="rounded-lg bg-black/20">
                <button
                  type="button"
                  onClick={() => toggleGrupo(clave)}
                  aria-expanded={!plegado}
                  className="flex w-full cursor-pointer items-center gap-1.5 px-2 py-0.5 text-left text-xs font-bold text-gray-200"
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
                {plegado ? null : (
                  <div className="space-y-0.5 px-1 pb-1">
                    {list.map((p) => (
                      <PendingCard
                        key={p.id}
                        partido={p}
                        issue={issueMap.get(p.id)}
                        readOnly={readOnly}
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
