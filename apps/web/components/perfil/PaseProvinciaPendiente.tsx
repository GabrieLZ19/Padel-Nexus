"use client";

import { useState } from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { sileo } from "sileo";
import FeedbackModal from "@/components/ui/FeedbackModal";
import { PasesService, type PaseRepresentacion } from "@/utils/services/pases";
import { formatearFechaHoraArgentina } from "@/utils/fechaArgentina";

function etiquetaAsociacion(
  asoc?: { nombre: string; provincia?: string | null } | null,
): string {
  if (!asoc?.nombre) return "—";
  return asoc.provincia ? `${asoc.nombre} · ${asoc.provincia}` : asoc.nombre;
}

interface PaseProvinciaPendienteProps {
  pase: PaseRepresentacion;
  onActualizado: () => void | Promise<void>;
}

export default function PaseProvinciaPendiente({
  pase,
  onActualizado,
}: PaseProvinciaPendienteProps) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const confirmarCancelar = async () => {
    setLoading(true);
    try {
      await PasesService.cancelar(pase.id);
      sileo.success({
        title: "Pase cancelado",
        description: "Podés pedir un nuevo pase cuando quieras.",
      });
      setCancelOpen(false);
      await onActualizado();
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "No se pudo cancelar el pedido.";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full mb-3 p-3 rounded-xl border border-amber-500/25 bg-amber-500/5 text-left space-y-2">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="size-3.5 text-amber-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
            Pase de provincia pendiente
          </p>
        </div>
        <p className="text-xs text-gray-300 leading-snug">
          {etiquetaAsociacion(pase.origen)}
          <span className="text-gray-500 mx-1">→</span>
          {etiquetaAsociacion(pase.destino)}
        </p>
        {pase.motivo ? (
          <p className="text-[11px] text-gray-500 line-clamp-2">
            Motivo: {pase.motivo}
          </p>
        ) : null}
        {pase.created_at ? (
          <p className="text-[10px] text-gray-600">
            Pedido el {formatearFechaHoraArgentina(pase.created_at)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          disabled={loading}
          className="text-[11px] font-bold text-amber-200 hover:text-white underline-offset-2 hover:underline cursor-pointer disabled:opacity-50"
        >
          Cancelar pedido
        </button>
      </div>

      <FeedbackModal
        isOpen={cancelOpen}
        type="warning"
        title="¿Cancelar el pase?"
        description="El pedido dejará de estar visible para la asociación de destino. Podés solicitar otro pase después."
        confirmText="Sí, cancelar"
        cancelText="Volver"
        isLoading={loading}
        onClose={() => !loading && setCancelOpen(false)}
        onConfirm={confirmarCancelar}
      />
    </>
  );
}
