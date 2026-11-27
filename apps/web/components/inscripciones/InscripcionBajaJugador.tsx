"use client";

import { useState } from "react";
import { Loader2, UserMinus } from "lucide-react";
import { sileo } from "sileo";
import { InscripcionesService } from "@/utils/services/inscripciones";
import FeedbackModal from "@/components/ui/FeedbackModal";
import {
  jugadorPuedeAutoBaja,
  inscripcionPagadaBloqueaBajaJugador,
  MENSAJE_BAJA_INSCRIPCION_PAGADA,
  torneoEstadoPermiteBajaJugador,
} from "@/utils/inscripcionBajaJugador";

type InscripcionBajaJugadorProps = {
  inscripcionId: string;
  torneoNombre: string;
  sinCosto: boolean;
  estadoPago?: string | null;
  estadoTorneo?: string | null;
  onBajaCompletada?: () => void;
};

export function InscripcionBajaJugador({
  inscripcionId,
  torneoNombre,
  sinCosto,
  estadoPago,
  estadoTorneo,
  onBajaCompletada,
}: InscripcionBajaJugadorProps) {
  const [confirmar, setConfirmar] = useState(false);
  const [procesando, setProcesando] = useState(false);

  const pagada = inscripcionPagadaBloqueaBajaJugador({ sinCosto, estadoPago });
  const torneoEditable = torneoEstadoPermiteBajaJugador(estadoTorneo);
  const puedeBaja = jugadorPuedeAutoBaja({
    sinCosto,
    estadoPago,
    estadoTorneo,
  });

  if (pagada) {
    return (
      <p className="text-xs text-amber-200/90 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 leading-relaxed">
        {MENSAJE_BAJA_INSCRIPCION_PAGADA}
      </p>
    );
  }

  if (!torneoEditable) {
    return (
      <p className="text-xs text-gray-400 rounded-xl border border-white/10 bg-white/5 px-3 py-2 leading-relaxed">
        El cuadro del torneo ya está armado. Para darte de baja, contactá al
        organizador.
      </p>
    );
  }

  if (!puedeBaja) return null;

  const ejecutarBaja = async () => {
    setProcesando(true);
    try {
      await InscripcionesService.eliminar(inscripcionId);
      sileo.success({
        title: "Inscripción cancelada",
        description: "Se liberó tu cupo en el torneo.",
      });
      setConfirmar(false);
      onBajaCompletada?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error ||
        "No se pudo cancelar la inscripción. Intentá de nuevo o contactá al club.";
      sileo.error({ title: "No se pudo dar de baja", description: message });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        disabled={procesando}
        className="inline-flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400/40 rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
      >
        {procesando ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <UserMinus className="size-3.5" />
        )}
        Darse de baja del torneo
      </button>

      <FeedbackModal
        isOpen={confirmar}
        onClose={() => setConfirmar(false)}
        type="warning"
        title="¿Cancelar inscripción?"
        description={`Vas a dejar de estar inscripto en "${torneoNombre}". Esta acción libera el cupo en el torneo.`}
        confirmText="Sí, darme de baja"
        cancelText="Volver"
        isLoading={procesando}
        onConfirm={() => void ejecutarBaja()}
      />
    </>
  );
}