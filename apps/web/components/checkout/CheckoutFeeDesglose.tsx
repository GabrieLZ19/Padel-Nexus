import { formatMontoArs } from "@/utils/formatMonto";
import {
  debeMostrarDesgloseFee,
  type CheckoutFeeResumen,
} from "@/utils/checkoutFee";

type Props = {
  resumen: CheckoutFeeResumen;
  className?: string;
  /** Etiqueta del total (por defecto "Total") */
  totalLabel?: string;
};

export function CheckoutFeeDesglose({
  resumen,
  className = "",
  totalLabel = "Total",
}: Props) {
  const bruto = Number(resumen.monto_bruto ?? resumen.monto);

  if (!debeMostrarDesgloseFee(resumen)) {
    return (
      <div className={className}>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {totalLabel}
          </span>
          <span className="text-2xl font-extrabold text-brand-chartreuse tracking-tight tabular-nums">
            {formatMontoArs(bruto)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 text-sm ${className}`}>
      <div className="flex justify-between text-gray-400">
        <span>Precio</span>
        <span className="tabular-nums text-white">
          {formatMontoArs(resumen.monto_bruto)}
        </span>
      </div>
      <div className="flex justify-between text-gray-400">
        <span>Cargo por servicio</span>
        <span className="tabular-nums text-white">
          {formatMontoArs(resumen.cargo_servicio)}
        </span>
      </div>
      <div className="pt-3 border-t border-dashed border-white/10 flex items-baseline justify-between gap-3">
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
          {totalLabel}
        </span>
        <span className="text-2xl font-extrabold text-brand-chartreuse tracking-tight tabular-nums">
          {formatMontoArs(resumen.monto)}
        </span>
      </div>
    </div>
  );
}