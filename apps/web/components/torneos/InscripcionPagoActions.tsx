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
      if (Number(pref.cargo_servicio) > 0 && pref.modo_fee === "sumar") {
        const plazas = pref.plazas && pref.plazas > 1 ? ` (${pref.plazas} plazas)` : "";
        sileo.info({
          title: "Checkout Mercado Pago",
          description: `Total $${Number(pref.monto).toLocaleString("es-AR")}${plazas}: inscripción + cargo por servicio $${Number(pref.cargo_servicio).toLocaleString("es-AR")}.`,
        });
      }
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
        Tu inscripción está pendiente de pago. Podés abonar con Mercado Pago (un
        solo checkout por todas las plazas).
        <span className="block mt-1 text-white font-semibold tabular-nums">
          Subtotal inscripción: ${Number(monto).toLocaleString("es-AR")}
        </span>
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