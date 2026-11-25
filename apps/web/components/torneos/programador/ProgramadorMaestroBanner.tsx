"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { useEffect, useState } from "react";
import { TorneosService } from "@/utils/services/torneos";

interface Props {
  torneoId: string;
  basePath: "dashboard" | "club";
}

export function ProgramadorMaestroBanner({ torneoId, basePath }: Props) {
  const [grupoId, setGrupoId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    TorneosService.getGrupoIdPorTorneo(torneoId)
      .then((r: { grupo_id: string | null }) => {
        if (mounted) setGrupoId(r.grupo_id);
      })
      .catch(() => {
        if (mounted) setGrupoId(null);
      });
    return () => {
      mounted = false;
    };
  }, [torneoId]);

  if (!grupoId) return null;

  const href = `/${basePath}/eventos/${grupoId}/programacion`;

  return (
    <span className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-brand-chartreuse/25 bg-brand-chartreuse/10 px-3 py-2 text-xs text-gray-200">
      <CalendarClock className="size-4 shrink-0 text-brand-chartreuse" aria-hidden />
      <span className="min-w-0 flex-1">
        Este torneo forma parte de un evento con varias categorías.
      </span>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center rounded-lg bg-brand-chartreuse px-3 py-1.5 text-[11px] font-bold text-black hover:brightness-110"
      >
        Abrir programador maestro
      </Link>
    </span>
  );
}