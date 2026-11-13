/**
 * Categoría de juego del torneo. `nivel` es 7ª, 5ª, etc.
 * `categoria` es la familia (Libres, Menores) y no debe usarse como
 * categoría requerida ni como default de una ficha nueva.
 */
export function categoriaRequeridaDelTorneo(torneo: {
  nivel?: string | null;
  categoria?: string | null;
}): string | null {
  const nivel = torneo.nivel?.trim();
  if (nivel) return nivel;
  const categoria = torneo.categoria?.trim();
  return categoria || null;
}
