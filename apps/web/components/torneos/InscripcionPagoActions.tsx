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
    } catch {
      setPlazasInfo(null);
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
      if (Number(pref.cargo_servicio) > 0 && pref.modo_fee === "sumar") {
        const plazas =
          pref.plazas && pref.plazas > 1
            ? ` (${pref.plazas} jugadores)`
            : " (1 jugador)";
        sileo.info({
          title: "Checkout Mercado Pago",
          description: `Total $${Number(pref.monto).toLocaleString("es-AR")}${plazas}, precio por jugador + cargo por servicio $${Number(pref.cargo_servicio).toLocaleString("es-AR")}.`,
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

  const mostrarDosBotones =
    plazasInfo &&
    (plazasInfo.puede_pagar_mi_plaza || plazasInfo.puede_pagar_todas);

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p className={`text-gray-400 ${compact ? "text-xs" : "text-sm"}`}>
        Tu inscripción tiene pago pendiente. Elegí pagar solo tu plaza o todas
        las plazas que falten.
        <span className="block mt-1 text-white font-semibold tabular-nums">
          Pendiente: ${totalPendiente.toLocaleString("es-AR")}
          {precioJugador > 0 ? (
            <span className="block text-xs font-normal text-gray-500 mt-0.5">
              ${precioJugador.toLocaleString("es-AR")} por jugador
            </span>
          ) : null}
        </span>
      </p>
      {cargandoPlazas ? (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="size-3 animate-spin" />
          Cargando opciones de pago...
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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