"use client";

import { Loader2 } from "lucide-react";

export type PlanillaImportProgressState = {
  percent: number;
  label: string;
  detail?: string;
};

interface Props {
  state: PlanillaImportProgressState;
}

/** Barra de progreso visible durante importación de planilla XLS. */
export function PlanillaImportProgressBar({ state }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(state.percent)));

  return (
    <div
      className="border-b border-brand-chartreuse/20 bg-brand-chartreuse/5 px-4 py-3 sm:px-6"
      role="status"
      aria-live="polite"
      aria-busy={pct < 100}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Loader2 className="size-4 shrink-0 animate-spin text-brand-chartreuse" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {state.label}
            </p>
            {state.detail ? (
              <p className="text-[11px] text-gray-400 truncate">{state.detail}</p>
            ) : null}
          </div>
        </div>
        <span className="text-xs font-bold tabular-nums text-brand-chartreuse shrink-0">
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full bg-brand-chartreuse transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
