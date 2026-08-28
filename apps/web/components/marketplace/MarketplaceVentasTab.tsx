"use client";

import Image from "next/image";
import { TrendingUp, ShoppingBag, Receipt, Inbox } from "lucide-react";

interface VentaItem {
  id: string;
  cantidad: number;
  precio_unitario: number;
  created_at?: string;
  producto?: { nombre?: string; thumbnail_url?: string | null };
  orden?: {
    estado?: string;
    created_at?: string;
    comprador?: { nombre?: string; apellido?: string; email?: string };
  };
}

interface Props {
  ventas: VentaItem[];
  stats?: { total_ventas?: number; ingresos_mes?: number; balance?: number };
}

const estadoStyles: Record<string, string> = {
  pagada: "bg-brand-chartreuse/15 text-brand-chartreuse border-brand-chartreuse/30",
  pendiente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  entregada: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelada: "bg-red-500/15 text-red-400 border-red-500/30",
};

export default function MarketplaceVentasTab({ ventas, stats }: Props) {
  const ingresosTotal = ventas.reduce(
    (sum, v) => sum + v.precio_unitario * v.cantidad,
    0,
  );

  if (ventas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-3xl border border-dashed border-brand-white/10 bg-brand-card/30">
        <div className="size-20 rounded-3xl bg-brand-chartreuse/10 flex items-center justify-center mb-6">
          <Inbox className="size-10 text-brand-chartreuse/60" />
        </div>
        <h3 className="text-xl font-black mb-2">Todavía no hay ventas</h3>
        <p className="text-sm text-gray-500 max-w-md">
          Cuando un jugador compre en tu tienda, vas a ver acá el detalle de cada pedido,
          el comprador y el estado del pago.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: "Ventas totales",
            value: stats?.total_ventas ?? ventas.length,
            icon: ShoppingBag,
            accent: "text-brand-chartreuse",
          },
          {
            label: "Ingresos del listado",
            value: `$${ingresosTotal.toLocaleString("es-AR")}`,
            icon: Receipt,
            accent: "text-brand-white",
          },
          {
            label: "Ingresos últimos 30 días",
            value: `$${Number(stats?.ingresos_mes || 0).toLocaleString("es-AR")}`,
            icon: TrendingUp,
            accent: "text-brand-chartreuse",
          },
        ].map((m) => (
          <div
            key={m.label}
            className="relative overflow-hidden rounded-2xl border border-brand-white/5 bg-brand-card p-5"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-chartreuse/5 rounded-full blur-2xl" />
            <m.icon className={`size-5 ${m.accent} mb-3 relative`} />
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider relative">
              {m.label}
            </p>
            <p className={`text-2xl font-black mt-1 relative ${m.accent}`}>{m.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-brand-white/5 overflow-hidden bg-brand-card">
        <div className="px-5 py-4 border-b border-brand-white/5 flex items-center justify-between">
          <h3 className="font-bold text-sm">Historial de ventas</h3>
          <span className="text-xs text-gray-500">{ventas.length} registros</span>
        </div>
        <div className="divide-y divide-brand-white/5">
          {ventas.map((v) => {
            const monto = v.precio_unitario * v.cantidad;
            const estado = (v.orden?.estado || "pendiente").toLowerCase();
            return (
              <div
                key={v.id}
                className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 hover:bg-brand-white/[0.02] transition-colors"
              >
                <div className="relative size-14 rounded-xl overflow-hidden bg-brand-black/50 shrink-0">
                  {v.producto?.thumbnail_url ? (
                    <Image
                      src={v.producto.thumbnail_url}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ShoppingBag className="size-5 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{v.producto?.nombre || "Producto"}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {v.orden?.comprador?.nombre} {v.orden?.comprador?.apellido}
                    {v.cantidad > 1 && (
                      <span className="text-gray-600"> · ×{v.cantidad}</span>
                    )}
                  </p>
                </div>
                <div className="flex sm:flex-col items-start sm:items-end gap-2 sm:gap-1 shrink-0">
                  <p className="text-lg font-black text-brand-chartreuse">
                    ${monto.toLocaleString("es-AR")}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      estadoStyles[estado] || estadoStyles.pendiente
                    }`}
                  >
                    {estado}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
