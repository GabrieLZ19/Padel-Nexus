/**
 * Devuelve los últimos 4 dígitos del DNI con el resto enmascarado (verificación pública).
 */
export function enmascararDni(dni: string | null | undefined): string | null {
  const limpio = String(dni ?? "").replace(/\D/g, "");
  if (limpio.length < 4) return null;
  return `•••• ${limpio.slice(-4)}`;
}
