"use client";

import { AlertTriangle, Mail } from "lucide-react";
import type { Vendedor } from "@/utils/services/marketplace";

function formatearFechaSuspension(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

interface Props {
  tienda: Vendedor;
}

export default function MarketplaceTiendaSuspendidaBanner({ tienda }: Props) {
  if (tienda.estado !== "suspendido") return null;

  const fecha = formatearFechaSuspension(tienda.suspendido_desde);
  const motivo =
    tienda.motivo_suspension?.trim() ||
    "No se registró un motivo detallado para esta suspensión.";

  return (
    <div
      role="status"
      className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 md:p-6 space-y-3"
    >
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <AlertTriangle className="size-5 text-amber-400" aria-hidden />
        </div>
        <div className="space-y-2 min-w-0">
          <h2 className="text-base font-black text-amber-100">Tienda suspendida</h2>
          <p className="text-sm text-amber-100/90 leading-relaxed">
            Tu tienda no aparece en el marketplace público ni podés crear o editar publicaciones
            hasta que un administrador de la plataforma la reactive.
          </p>
          <div className="rounded-xl bg-brand-black/30 border border-amber-500/20 px-4 py-3 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-200/80">
              Motivo registrado
            </p>
            <p className="text-sm text-brand-white whitespace-pre-wrap">{motivo}</p>
            {fecha ? (
              <p className="text-xs text-gray-400">Suspendida el {fecha}</p>
            ) : null}
          </div>
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <Mail className="size-4 text-amber-400 shrink-0 mt-0.5" aria-hidden />
            <p>
              Para reactivar la tienda, contactá a la Federación o al equipo de Padel Nexus con
              la corrección del motivo indicado. Podés consultar ventas y publicaciones existentes
              en modo solo lectura.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}