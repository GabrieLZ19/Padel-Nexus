"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { sileo } from "sileo";
import { InscripcionesService } from "@/utils/services/inscripciones";
import { inscripcionRequierePagoOnline } from "@/utils/inscripcionPago";

interface InscripcionPagoActionsProps {
  inscripcionId: string;
  monto: number;
  estadoPago?: string | null;
  esGratis?: boolean | null;
  precioInscripcion?: number | null;
  compact?: boolean;
  onPagoIniciado?: () => void;
}

export function InscripcionPagoActions({
  inscripcionId,
  monto,
  estadoPago,
  esGratis,
  precioInscripcion,
  compact = false,
  onPagoIniciado,
}: InscripcionPagoActionsProps) {
  const [procesando, setProcesando] = useState(false);

  const pendiente = inscripcionRequierePagoOnline({
    esGratis,
    monto,
    precioInscripcion,
    estadoPago,
  });

  if (!pendiente) {
    if ((estadoPago || "").toLowerCase() === "confirmado") {
      return (
        <p className="text-xs font-semibold text-emerald-400">
          Pago confirmado. Estás habilitado para jugar.
        </p>
      );
    }
    return null;
  }

  const pagar = async () => {
    setProcesando(true);
    try {
      const pref = await InscripcionesService.crearPreferenciaMp(inscripcionId);
      onPagoIniciado?.();
      const checkout = pref.initPoint || pref.sandboxInitPoint;
      if (!checkout) {
        sileo.error({
          title: "Pago no disponible",
          description:
            "Mercado Pago no está disponible. El organizador confirmará el pago manualmente.",
        });
        return;
      }
      window.location.href = checkout;
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "No se pudo iniciar el pago.";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={`text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>
        Tu inscripción está pendiente de pago (
        <span className="text-white font-semibold tabular-nums">
          ${Number(monto).toLocaleString("es-AR")}
        </span>
        ). Podés abonar con Mercado Pago.
      </p>
      <button
        type="button"
        disabled={procesando}
        onClick={() => void pagar()}
        className={`w-full bg-brand-chartreuse disabled:opacity-50 hover:opacity-95 text-brand-black font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
          compact ? "py-2.5 text-sm" : "py-3.5 text-sm"
        }`}
      >
        {procesando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Pagar con Mercado Pago
            <CreditCard className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}