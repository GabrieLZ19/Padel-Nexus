"use client";

import { useEffect, useState } from "react";
import { Upload, X } from "lucide-react";
import { colorCategoriaEvento } from "@/utils/eventoCategoriaColores";
import type { ProgramacionBoardEvento } from "@/utils/services/torneos";

interface Props {
  open: boolean;
  onClose: () => void;
  board: ProgramacionBoardEvento;
  advertencias: number;
  busy?: boolean;
  onConfirm: (torneoIds: string[]) => void;
}

export function EventoPublicarModal({
  open,
  onClose,
  board,
  advertencias,
  busy,
  onConfirm,
}: Props) {
  const torneoIds = board.torneos.map((t) => t.id);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set(torneoIds));

  useEffect(() => {
    if (open) setSeleccion(new Set(torneoIds));
  }, [open, torneoIds.join("|")]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const ids = [...seleccion];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="evento-publicar-title"
    >
      <div className="prog-surface w-full max-w-md rounded-2xl border border-white/15 p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <PublicarModalHeader advertencias={advertencias} />
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1 text-gray-400 hover:bg-white/10 hover:text-white cursor-pointer disabled:opacity-50"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>
        <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/30 p-2">
          {board.torneos.map((t) => {
            const color = colorCategoriaEvento(t.id, torneoIds);
            return (
              <li key={t.id}>
                <label className="flex cursor-pointer items-center gap-2 py-1 text-xs text-gray-200">
                  <input
                    type="checkbox"
                    checked={seleccion.has(t.id)}
                    onChange={() => toggle(t.id)}
                    className="rounded border-white/20 accent-brand-chartreuse"
                  />
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="min-w-0 truncate">{t.nombre}</span>
                  {t.programacion_estado ? (
                    <span className="ml-auto text-[10px] uppercase text-gray-500">
                      {t.programacion_estado}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
        <CardActions
          busy={busy}
          disabled={ids.length === 0}
          onCancel={onClose}
          onConfirm={() => onConfirm(ids)}
        />
      </div>
    </div>
  );
}

function PublicarModalHeader({ advertencias }: { advertencias: number }) {
  return (
    <div>
      <h2
        id="evento-publicar-title"
        className="text-base font-bold text-brand-white"
      >
        Publicar horarios del evento
      </h2>
      <p className="mt-1 text-xs text-gray-400">
        Elegí las categorías a publicar. Cada una pasa a En curso con horarios
        visibles.
        {advertencias > 0
          ? ` Hay ${advertencias} alerta(s) en la grilla.`
          : null}
      </p>
    </div>
  );
}

function CardActions({
  busy,
  disabled,
  onCancel,
  onConfirm,
}: {
  busy?: boolean;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={onCancel}
        className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-300 hover:bg-white/10 cursor-pointer disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="button"
        disabled={busy || disabled}
        onClick={onConfirm}
        className="inline-flex items-center gap-2 rounded-xl bg-brand-chartreuse px-4 py-2 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50 cursor-pointer"
      >
        <Upload className="size-4" />
        Publicar selección
      </button>
    </div>
  );
}