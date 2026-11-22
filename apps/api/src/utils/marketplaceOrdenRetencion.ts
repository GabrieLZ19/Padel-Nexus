import { MARKETPLACE_ORDEN_PENDIENTE_MINUTOS } from "../constants/marketplace";

export interface OrdenRetencionInput {
  estado?: string | null;
  created_at?: string | null;
  retiene_hasta?: string | null;
}

export function sumarMinutosOrden(desde: Date, minutos: number): Date {
  return new Date(desde.getTime() + minutos * 60_000);
}

export function retencionInicialOrdenDesde(ahora: Date): string {
  return sumarMinutosOrden(
    ahora,
    MARKETPLACE_ORDEN_PENDIENTE_MINUTOS,
  ).toISOString();
}

export function ordenPendienteExpirada(
  orden: OrdenRetencionInput,
  ahora = new Date(),
): boolean {
  const estado = (orden.estado || "").toLowerCase();
  if (estado !== "pendiente") return false;

  if (orden.retiene_hasta) {
    return ahora >= new Date(orden.retiene_hasta);
  }

  if (orden.created_at) {
    const limite = sumarMinutosOrden(
      new Date(orden.created_at),
      MARKETPLACE_ORDEN_PENDIENTE_MINUTOS,
    );
    return ahora >= limite;
  }

  return false;
}