"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatearCuentaRegresiva,
  msRestantesPlazoPago,
  type ReservaConPlazoPago,
} from "@/utils/reservaPlazoPago";

type Props = {
  reserva: ReservaConPlazoPago;
  onVencido?: () => void;
  className?: string;
};

export function ReservaPlazoPagoBanner({
  reserva,
  onVencido,
  className = "",
}: Props) {
  const [restante, setRestante] = useState<number | null>(() =>
    msRestantesPlazoPago(reserva),
  );

  useEffect(() => {
    const tick = () => {
      const ms = msRestantesPlazoPago(reserva);
      setRestante(ms);
      if (ms != null && ms <= 0) onVencido?.();
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [reserva, onVencido]);

  if (restante == null) return null;

  const vencido = restante <= 0;

  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
        vencido
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-amber-500/30 bg-amber-500/10 text-amber-200"
      } ${className}`}
    >
      <Clock className="size-4 shrink-0 mt-0.5" />
      <div>
        {vencido ? (
          <p className="font-semibold">
            El plazo para pagar venció. El turno ya no está reservado.
          </p>
        ) : (
          <>
            <p className="font-semibold">
              Tiempo para completar el pago:{" "}
              <span className="tabular-nums text-white">
                {formatearCuentaRegresiva(restante)}
              </span>
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">
              Si no pagás antes, liberamos el turno automáticamente.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
