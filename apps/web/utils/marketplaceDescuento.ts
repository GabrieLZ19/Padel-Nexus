/** Porcentaje de descuento cuando precio_anterior > precio. */
export function calcPorcentajeDescuento(
  precio: number,
  precioAnterior?: number | null,
): number | null {
  if (!precioAnterior || precioAnterior <= precio || precio <= 0) return null;
  return Math.round((1 - precio / precioAnterior) * 100);
}

export function tieneDescuento(precio: number, precioAnterior?: number | null): boolean {
  return calcPorcentajeDescuento(precio, precioAnterior) !== null;
}
