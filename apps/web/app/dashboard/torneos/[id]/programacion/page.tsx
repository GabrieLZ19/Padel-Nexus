"use client";

import { useParams } from "next/navigation";
import { ProgramadorVisualPage } from "@/components/torneos/programador/ProgramadorVisualPage";
import { ProgramadorMaestroBanner } from "@/components/torneos/programador/ProgramadorMaestroBanner";

export default function DashboardTorneoProgramacionPage() {
  const params = useParams();
  const id = params?.id as string;
  if (!id) return null;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-2 pt-2 sm:px-3">
        <ProgramadorMaestroBanner torneoId={id} basePath="dashboard" />
      </div>
      <div className="min-h-0 flex-1">
        <ProgramadorVisualPage
          torneoId={id}
          backHref={`/dashboard/torneos/${id}?step=cuadros`}
        />
      </div>
    </div>
  );
}
