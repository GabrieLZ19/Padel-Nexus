import { supabaseAdmin } from "../config/supabase";
import { marketplaceOrdenEstadoCobrado } from "../constants/marketplace";

export type FilaVentaOrdenEstado = {
  orden_id: string;
  estado?: string | null;
};

/** Órdenes distintas con pago confirmado (pagada / entregada). */
export function contarOrdenesCobradasDesdeFilas(
  filas: FilaVentaOrdenEstado[],
): number {
  const vistos = new Set<string>();
  for (const f of filas) {
    if (!marketplaceOrdenEstadoCobrado(f.estado)) continue;
    vistos.add(f.orden_id);
  }
  return vistos.size;
}

export function contarUnidadesCobradasDesdeFilas(
  filas: Array<{ estado?: string | null; cantidad: number }>,
): number {
  return filas.reduce((sum, f) => {
    if (!marketplaceOrdenEstadoCobrado(f.estado)) return sum;
    return sum + Math.max(0, Number(f.cantidad) || 0);
  }, 0);
}

export async function contarOrdenesCobradasPorVendedor(
  vendedorId: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("marketplace_items_orden")
    .select("orden_id, orden:marketplace_ordenes!inner(estado)")
    .eq("vendedor_id", vendedorId);

  if (error || !data?.length) return 0;

  const filas: FilaVentaOrdenEstado[] = data.map((row) => {
    const orden = row.orden as { estado?: string } | { estado?: string }[] | null;
    const o = Array.isArray(orden) ? orden[0] : orden;
    return {
      orden_id: String(row.orden_id),
      estado: o?.estado,
    };
  });

  return contarOrdenesCobradasDesdeFilas(filas);
}

export async function contarUnidadesCobradasPorProducto(
  productoId: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("marketplace_items_orden")
    .select(
      "cantidad, orden:marketplace_ordenes!inner(estado)",
    )
    .eq("producto_id", productoId);

  if (error || !data?.length) return 0;

  return contarUnidadesCobradasDesdeFilas(
    data.map((row) => {
      const orden = row.orden as { estado?: string } | { estado?: string }[] | null;
      const o = Array.isArray(orden) ? orden[0] : orden;
      return { estado: o?.estado, cantidad: Number(row.cantidad) || 0 };
    }),
  );
}

/** Persiste `total_ventas` alineado a órdenes cobradas (idempotente). */
export async function sincronizarTotalVentasVendedor(
  vendedorId: string,
): Promise<number> {
  const total = await contarOrdenesCobradasPorVendedor(vendedorId);
  await supabaseAdmin
    .from("marketplace_vendedores")
    .update({ total_ventas: total })
    .eq("id", vendedorId);
  return total;
}