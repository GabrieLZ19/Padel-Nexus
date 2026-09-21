"use client";

import { useParams } from "next/navigation";
import { ProgramadorVisualPage } from "@/components/torneos/programador/ProgramadorVisualPage";

export default function DashboardTorneoProgramacionPage() {
  const params = useParams();
  const id = params?.id as string;
  if (!id) return null;
  return (
    <ProgramadorVisualPage
      torneoId={id}
      backHref={`/dashboard/torneos/${id}?step=cuadros`}
    />
  );
}
