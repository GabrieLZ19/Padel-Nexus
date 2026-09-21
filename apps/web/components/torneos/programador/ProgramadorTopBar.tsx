"use client";

import {
  CalendarClock,
  Eraser,
  Lock,
  Sparkles,
  Upload,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import type { ProgramacionBoard } from "@/utils/services/torneos";

interface Props {
  board: ProgramacionBoard;
  busy: boolean;
  syncing?: boolean;
  isReadOnly: boolean;
  sedesHref: string;
  onAuto: () => void;
  onLimpiar: () => void;
  onPublicar: () => void;
  onNuevaEdicion: () => void;
  onBack: () => void;
  onFocusConflictos?: () => void;
}

function estadoHint(estado: string): string {
  if (estado === "publicado") {
    return "Visible y bloqueado. Usá Nueva edición para cambiar.";
  }
  if (estado === "programado") {
    return "Horarios guardados al soltar. Publicá cuando esté listo para el público.";
  }
  return "Los cambios se guardan al soltar. Todavía no es público.";
}

export function ProgramadorTopBar({
  board,
  busy,
  syncing,
  isReadOnly,
  sedesHref,
  onAuto,
  onLimpiar,
  onPublicar,
  onNuevaEdicion,
  onBack,
  onFocusConflictos,
}: Props) {
  const estado = board.programacion_estado;
  const estadoLabel =
    estado === "publicado"
      ? "Publicado"
      : estado === "programado"
        ? "Programado"
        : "Borrador";

  const canLimpiar = !isReadOnly && board.summary.asignados > 0;

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 hover:bg-white/10 cursor-pointer"
        >
          Volver
        </button>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CalendarClock className="size-5 text-brand-chartreuse shrink-0" />
            <h1 className="text-xl font-bold text-white truncate">
              Programador visual
            </h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                estado === "publicado"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : estado === "programado"
                    ? "bg-amber-500/15 text-amber-200"
                    : "bg-white/10 text-gray-300"
              }`}
            >
              {estado === "publicado" ? (
                <Lock className="size-3" />
              ) : (
                <Unlock className="size-3" />
              )}
              {estadoLabel}
            </span>
            {syncing ? (
              <span className="text-[11px] text-gray-500 animate-pulse">
                Sync…
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-400 truncate">{board.nombre}</p>
          <p className="mt-1 text-xs text-gray-500">{estadoHint(estado)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {board.summary.asignados}/{board.summary.total} asignados
            {board.summary.advertencias > 0 ? (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={onFocusConflictos}
                  className="text-amber-300 underline-offset-2 hover:underline cursor-pointer"
                >
                  {board.summary.advertencias} alerta(s)
                </button>
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={sedesHref}
          title="Agregar sede o cancha y volvé; la grilla se recalcula"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/10"
        >
          + Club / cancha
        </Link>
        {isReadOnly ? (
          <button
            type="button"
            disabled={busy}
            onClick={onNuevaEdicion}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:opacity-50 cursor-pointer"
          >
            <Unlock className="size-4" />
            Nueva edición
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={busy || !canLimpiar}
              onClick={onLimpiar}
              title="Quitar todos los horarios y empezar de cero"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-gray-300 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-200 disabled:opacity-50 cursor-pointer"
            >
              <Eraser className="size-4" />
              Limpiar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onAuto}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="size-4 text-brand-chartreuse" />
              Auto-asignar
            </button>
            <button
              type="button"
              disabled={busy || board.summary.pendientes > 0}
              onClick={onPublicar}
              title="Hacer público y bloquear la grilla"
              className="inline-flex flex-col items-start gap-0 rounded-xl bg-brand-chartreuse px-4 py-2 text-left hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 text-sm font-bold text-black">
                <Upload className="size-4" />
                Publicar
              </span>
              <span className="text-[10px] font-medium text-black/70">
                Hacer público y bloquear
              </span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
