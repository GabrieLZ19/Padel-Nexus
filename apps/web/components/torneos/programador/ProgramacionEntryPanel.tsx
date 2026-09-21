"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarClock, ExternalLink, AlertTriangle } from "lucide-react";
import {
  TorneosService,
  type ProgramacionBoard,
} from "@/utils/services/torneos";

interface Props {
  torneoId: string;
}

function estadoLabel(estado: string): string {
  if (estado === "publicado") return "Publicado";
  if (estado === "programado") return "Programado";
  return "Borrador";
}

export function ProgramacionEntryPanel({ torneoId }: Props) {
  const pathname = usePathname();
  const [board, setBoard] = useState<ProgramacionBoard | null>(null);
  const [loading, setLoading] = useState(true);

  const base = pathname?.startsWith("/club") ? "/club" : "/dashboard";
  const href = `${base}/torneos/${torneoId}/programacion`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await TorneosService.getProgramacionBoard(torneoId);
        if (!cancelled) setBoard(data);
      } catch {
        if (!cancelled) setBoard(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [torneoId]);

  const estado = board?.programacion_estado || "borrador";

  return (
    <div className="rounded-2xl border border-white/10 bg-[#161616] p-6 md:p-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-brand-chartreuse">
            <CalendarClock className="size-5" />
            <h3 className="text-lg font-bold text-white">
              Programación de partidos
            </h3>
          </div>
          <p className="max-w-xl text-sm text-gray-400">
            Arrastrá partidos a la grilla (08:00–21:00). Cada drop se guarda;
            Publicar solo hace visibles los horarios y bloquea la edición.
          </p>
          {loading ? (
            <p className="text-xs text-gray-500">Cargando resumen…</p>
          ) : board ? (
            <ul className="mt-3 flex flex-wrap gap-3 text-xs text-gray-300">
              <li className="rounded-full bg-white/5 px-3 py-1">
                Estado:{" "}
                <span className="font-semibold text-white">
                  {estadoLabel(estado)}
                </span>
              </li>
              <li className="rounded-full bg-white/5 px-3 py-1">
                Asignados:{" "}
                <span className="font-semibold text-white">
                  {board.summary.asignados}/{board.summary.total}
                </span>
              </li>
              {board.summary.advertencias > 0 && (
                <li className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-amber-200">
                  <AlertTriangle className="size-3" />
                  {board.summary.advertencias} alerta(s)
                </li>
              )}
            </ul>
          ) : (
            <p className="text-xs text-gray-500">
              Configurá sedes y canchas en Paso 5 si aún no hay grilla.
            </p>
          )}
        </div>

        <Link
          href={href}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-chartreuse px-5 py-3 text-sm font-bold text-black hover:brightness-110"
        >
          Abrir programador visual
          <ExternalLink className="size-4" />
        </Link>
      </div>
      <p className="mt-4 text-xs text-gray-500">
        Para sumar clubes o canchas, usá{" "}
        <Link
          href={`${base}/torneos/${torneoId}?step=times`}
          className="text-brand-chartreuse hover:underline"
        >
          Paso 5 · Sedes
        </Link>
        . Los partidos ya asignados se conservan.
      </p>
    </div>
  );
}
