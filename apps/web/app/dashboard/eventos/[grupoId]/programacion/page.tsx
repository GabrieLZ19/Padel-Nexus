"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProgramadorVisualPage } from "@/components/torneos/programador/ProgramadorVisualPage";
import {
  TorneosService,
  type ProgramacionBoardEvento,
} from "@/utils/services/torneos";

export default function DashboardEventoProgramacionPage() {
  const params = useParams();
  const router = useRouter();
  const grupoId = params?.grupoId as string;
  const [torneoRef, setTorneoRef] = useState<string>("");
  const [eventoNombre, setEventoNombre] = useState<string | null>(null);
  const [initialBoard, setInitialBoard] =
    useState<ProgramacionBoardEvento | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!grupoId) return;
    TorneosService.getEventoProgramacionBoard(grupoId)
      .then((board: ProgramacionBoardEvento) => {
        setTorneoRef(board.torneo_referencia_id);
        setEventoNombre(board.evento_nombre);
        setInitialBoard(board);
      })
      .catch(() => {
        setError("No se pudo cargar el evento o no tiene categorías agrupadas.");
      });
  }, [grupoId]);

  if (error) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>{error}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/torneos")}
          className="mt-4 text-brand-chartreuse font-bold cursor-pointer"
        >
          Volver a torneos
        </button>
      </div>
    );
  }

  if (!torneoRef) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-gray-400">
        Cargando programador del evento…
      </div>
    );
  }

  return (
    <ProgramadorVisualPage
      torneoId={torneoRef}
      grupoId={grupoId}
      tituloEvento={eventoNombre}
      initialBoard={initialBoard}
      backHref="/dashboard/torneos"
    />
  );
}