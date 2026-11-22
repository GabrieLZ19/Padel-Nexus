"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { sileo } from "sileo";
import {
  InscripcionesService,
  type EstadoPlazasPagoInscripcion,
} from "@/utils/services/inscripciones";
import { inscripcionRequierePagoOnline } from "@/utils/inscripcionPago";
import { montoInscripcionPublico } from "@/utils/inscripcionMonto";
import { CheckoutFeeDesglose } from "@/components/checkout/CheckoutFeeDesglose";
import type { CheckoutFeeResumen } from "@/utils/checkoutFee";
import { debeMostrarDesgloseFee } from "@/utils/checkoutFee";

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
  const [plazasInfo, setPlazasInfo] =
    useState<EstadoPlazasPagoInscripcion | null>(null);
  const [cargandoPlazas, setCargandoPlazas] = useState(true);
  const [desgloseTodas, setDesgloseTodas] = useState<CheckoutFeeResumen | null>(
    null,
  );
  const [desgloseMiPlaza, setDesgloseMiPlaza] =
    useState<CheckoutFeeResumen | null>(null);

  const pendiente = inscripcionRequierePagoOnline({
    esGratis,
    monto,
    precioInscripcion,
    estadoPago,
  });

  const cargarPlazas = useCallback(async () => {
    if (!pendiente) {
      setCargandoPlazas(false);
      return;
    }
    setCargandoPlazas(true);
    try {
      const data = await InscripcionesService.obtenerPlazasPago(inscripcionId);
      setPlazasInfo(data);
      const previews = await Promise.allSettled([
        InscripcionesService.previewCheckoutMp(inscripcionId, "todas_pendientes"),
        data.puede_pagar_mi_plaza
          ? InscripcionesService.previewCheckoutMp(inscripcionId, "mi_plaza")
          : Promise.resolve(null),
      ]);
      if (previews[0].status === "fulfilled" && previews[0].value) {
        const p = previews[0].value;
        setDesgloseTodas({
          monto_bruto: Number(p.monto_bruto ?? p.monto),
          cargo_servicio: p.cargo_servicio,
          modo_fee: p.modo_fee,
          monto: Number(p.monto),
        });
      } else {
        setDesgloseTodas(null);
      }
      if (
        previews[1].status === "fulfilled" &&
        previews[1].value &&
        typeof previews[1].value === "object"
      ) {
        const p = previews[1].value;
        setDesgloseMiPlaza({
          monto_bruto: Number(p.monto_bruto ?? p.monto),
          cargo_servicio: p.cargo_servicio,
          modo_fee: p.modo_fee,
          monto: Number(p.monto),
        });
      } else {
        setDesgloseMiPlaza(null);
      }
    } catch {
      setPlazasInfo(null);
      setDesgloseTodas(null);
      setDesgloseMiPlaza(null);
    } finally {
      setCargandoPlazas(false);
    }
  }, [inscripcionId, pendiente]);

  useEffect(() => {
    void cargarPlazas();
  }, [cargarPlazas]);

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

  const precioJugador =
    plazasInfo?.precio_por_jugador ?? Number(precioInscripcion || 0);
  const totalPendiente = plazasInfo?.plazas_pendientes.length
    ? montoInscripcionPublico(
        precioJugador,
        plazasInfo.plazas_pendientes.length,
      )
    : Number(monto);

  const iniciarMp = async (alcance: "mi_plaza" | "todas_pendientes") => {
    setProcesando(true);
    try {
      const pref = await InscripcionesService.crearPreferenciaMp(
        inscripcionId,
        alcance,
      );
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

  const mostrarDosBotones =
    plazasInfo &&
    (plazasInfo.puede_pagar_mi_plaza || plazasInfo.puede_pagar_todas);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={`text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>
        Tu inscripción tiene pago pendiente. Elegí pagar solo tu plaza o todas
        las plazas que falten.
        {desgloseTodas && debeMostrarDesgloseFee(desgloseTodas) ? (
          <span className="block mt-2 rounded-xl border border-white/10 bg-brand-black/40 p-3">
            <CheckoutFeeDesglose
              resumen={desgloseTodas}
              totalLabel="Total pendiente (MP)"
            />
          </span>
        ) : (
          <span className="block mt-1 text-white font-semibold tabular-nums">
            Pendiente: ${totalPendiente.toLocaleString("es-AR")}
          </span>
        )}
        {precioJugador > 0 ? (
          <span className="block text-xs font-normal text-gray-500 mt-0.5">
            ${precioJugador.toLocaleString("es-AR")} por jugador
          </span>
        ) : null}
      </p>
      {cargandoPlazas ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="size-3 animate-spin" />
          Cargando opciones de pago...
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {desgloseMiPlaza && debeMostrarDesgloseFee(desgloseMiPlaza) ? (
            <p className="text-[11px] text-gray-500 leading-snug">
              Pagar mi plaza en MP:{" "}
              <span className="text-white font-semibold tabular-nums">
                ${desgloseMiPlaza.monto.toLocaleString("es-AR")}
              </span>{" "}
              (precio + cargo por servicio)
            </p>
          ) : null}
          {plazasInfo?.puede_pagar_mi_plaza ? (
            <button
              type="button"
              disabled={procesando}
              onClick={() => void iniciarMp("mi_plaza")}
              className={`w-full border border-brand-chartreuse/40 bg-brand-chartreuse/10 disabled:opacity-50 hover:bg-brand-chartreuse/20 text-brand-chartreuse font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
                compact ? "py-2.5 text-sm" : "py-3 text-sm"
              }`}
            >
              {procesando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  Pagar mi plaza
                  <CreditCard className="size-4" />
                </>
              )}
            </button>
          ) : null}
          {plazasInfo?.plazas_pendientes.length ? (
            <button
              type="button"
              disabled={procesando}
              onClick={() =>
                void iniciarMp(
                  plazasInfo.puede_pagar_todas
                    ? "todas_pendientes"
                    : "todas_pendientes",
                )
              }
              className={`w-full bg-brand-chartreuse disabled:opacity-50 hover:opacity-95 text-brand-black font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer ${
                compact ? "py-2.5 text-sm" : "py-3 text-sm"
              }`}
            >
              {procesando ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {plazasInfo.plazas_pendientes.length > 1
                    ? "Pagar las dos plazas"
                    : plazasInfo.puede_pagar_resto
                      ? "Pagar plazas pendientes"
                      : "Pagar con Mercado Pago"}
                  <CreditCard className="size-4" />
                </>
              )}
            </button>
          ) : !mostrarDosBotones ? (
            <button
              type="button"
              disabled={procesando}
              onClick={() => void iniciarMp("todas_pendientes")}
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
          ) : null}
        </div>
      )}
    </div>
  );
}