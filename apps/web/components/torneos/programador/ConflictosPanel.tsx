"use client";

import { AlertTriangle, MapPin } from "lucide-react";
import type {
  BoardPartido,
  ProgramacionIssue,
} from "@/utils/services/torneos";

interface Props {
  issues: ProgramacionIssue[];
  partidos: BoardPartido[];
  highlightedId: string | null;
  onSelect: (partidoId: string) => void;
}

function formatPartidoSlot(p: BoardPartido | undefined): string | null {
  if (!p?.fecha_partido && !p?.cancha_asignada) return null;
  const fecha = p.fecha_partido
    ? String(p.fecha_partido).replace("T", " ").slice(0, 16)
    : null;
  return [fecha, p.cancha_asignada].filter(Boolean).join(" · ");
}

export function ConflictosPanel({
  issues,
  partidos,
  highlightedId,
  onSelect,
}: Props) {
  const activos = issues.filter((i) => i.severity !== "ok");
  if (activos.length === 0) return null;

  const partidoMap = new Map(partidos.map((p) => [p.id, p]));

  return (
    <div
      id="programador-conflictos"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
    >
      <div className="mb-2 flex items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-amber-100">
            {activos.length} conflicto(s) o advertencia(s)
          </p>
          <p className="text-xs text-amber-100/70">
            No bloquean el guardado. Tocá uno para ir al partido en la grilla.
          </p>
        </div>
      </div>
      <ul className="space-y-1.5">
        {activos.map((issue) => {
          const p = partidoMap.get(issue.partido_id);
          const active = highlightedId === issue.partido_id;
          const slotLabel = formatPartidoSlot(p);
          return (
            <li key={issue.partido_id}>
              <button
                type="button"
                onClick={() => onSelect(issue.partido_id)}
                className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer ${
                  active
                    ? "border-amber-400/60 bg-black/40"
                    : "border-white/10 bg-black/20 hover:border-amber-500/40"
                }`}
              >
                <span
                  className={`mt-0.5 size-2 shrink-0 rounded-full ${
                    issue.severity === "bad" ? "bg-red-400" : "bg-amber-300"
                  }`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-white">
                    {p?.ronda || "Partido"}
                    {p?.orden != null ? ` · #${p.orden}` : ""}
                  </span>
                  <span className="block text-xs text-amber-50/90">
                    {issue.message}
                  </span>
                  {slotLabel ? (
                    <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-gray-400">
                      <MapPin className="size-3" />
                      {slotLabel}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
