import { calcPorcentajeDescuento } from "@/utils/marketplaceDescuento";

interface DescuentoBadgeProps {
  precio: number;
  precioAnterior?: number | null;
  variant?: "overlay" | "inline" | "large";
  className?: string;
}

export default function DescuentoBadge({
  precio,
  precioAnterior,
  variant = "overlay",
  className = "",
}: DescuentoBadgeProps) {
  const pct = calcPorcentajeDescuento(precio, precioAnterior);
  if (pct === null) return null;

  const label = `${pct}% OFF`;

  if (variant === "inline") {
    return (
      <span
        className={`inline-flex items-center text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500 text-white ${className}`}
      >
        {label}
      </span>
    );
  }

  if (variant === "large") {
    return (
      <span
        className={`inline-flex items-center text-xs font-black uppercase px-3 py-1 rounded-full bg-red-500 text-white shadow-lg shadow-red-500/25 ${className}`}
      >
        {label}
      </span>
    );
  }

  return (
    <span
      className={`absolute top-3 left-3 z-10 inline-flex items-center text-[10px] font-black uppercase px-2 py-1 rounded-full bg-red-500 text-white shadow-md ${className}`}
    >
      {label}
    </span>
  );
}
