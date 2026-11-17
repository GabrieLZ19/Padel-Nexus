"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Loader2, Wallet } from "lucide-react";
import { sileo } from "sileo";
import { PlatformFeesService } from "@/utils/services/platformFees";

interface TorneoSaldoPadelNexusProps {
  torneoId: string;
  className?: string;
}

export function TorneoSaldoPadelNexus({
  torneoId,
  className = "",
}: TorneoSaldoPadelNexusProps) {
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [saldo, setSaldo] = useState(0);
  const [movimientos, setMovimientos] = useState(0);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PlatformFeesService.saldoTorneo(torneoId);
      setSaldo(Number(data.saldo_pendiente || 0));
      setMovimientos(data.cantidad_movimientos || 0);
    } catch {
      setSaldo(0);
      setMovimientos(0);
    } finally {
      setLoading(false);
    }
  }, [torneoId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const pagar = async () => {
    setProcesando(true);
    try {
      const pref = await PlatformFeesService.crearPreferenciaSaldoTorneo(torneoId);
      const url = pref.initPoint || pref.sandboxInitPoint;
      if (!url) {
        sileo.error({
          title: "Pago no disponible",
          description: "Mercado Pago no está configurado.",
        });
        return;
      }
      window.location.href = url;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "No se pudo iniciar el pago.";
      sileo.error({ title: "Error", description: msg });
    } finally {
      setProcesando(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-brand-card p-4 ${className}`}
      >
        <p className="text-xs text-gray-500">Calculando saldo con Padel Nexus...</p>
      </div>
    );
  }

  if (saldo <= 0) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 md:p-5 ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-500/15 p-2 text-amber-400">
          <Wallet className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">Saldo con Padel Nexus</p>
          <p className="text-xs text-gray-400 mt-1">
            Cargos por servicio de inscripciones pagadas fuera de Mercado Pago (
            {movimientos} movimiento{movimientos === 1 ? "" : "s"}).
          </p>
          <p className="text-2xl font-black tabular-nums text-amber-300 mt-2">
            ${saldo.toLocaleString("es-AR")}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={procesando}
        onClick={() => void pagar()}
        className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-brand-chartreuse py-3 text-sm font-bold text-brand-black disabled:opacity-50"
      >
        {procesando ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            Pagar saldo con Mercado Pago
            <CreditCard className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}