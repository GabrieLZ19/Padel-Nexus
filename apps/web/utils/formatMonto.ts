/** Monto en pesos argentinos con separador de miles (ej. $8.000). */
export function formatMontoArs(monto: number | string | null | undefined): string {
  const n = Number(monto);
  if (!Number.isFinite(n)) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}
