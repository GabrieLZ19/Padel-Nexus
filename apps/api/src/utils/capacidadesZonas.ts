/**
 * Capacidades por zona según reglamento FAP/APA/Amateur.
 * Zonas de 4 por sobrante van primero (Zona A, y Zona B si hay dos).
 */
export function getCapacidadesZonasPreferidas(
  total: number,
  preferredSize: 3 | 4,
): number[] {
  if (total < 3) return total > 0 ? [total] : [];
  if (preferredSize === 3) {
    const mod = total % 3;
    if (mod === 0) return Array(total / 3).fill(3);
    if (mod === 1) {
      const count3 = Math.floor((total - 4) / 3);
      if (count3 >= 0) return [4, ...Array(count3).fill(3)];
    }
    if (mod === 2) {
      const count3 = Math.floor((total - 8) / 3);
      if (count3 >= 0) return [4, 4, ...Array(count3).fill(3)];
    }
    if (total === 5) return [3, 2];
    if (total === 4) return [4];
  } else {
    const mod = total % 4;
    if (mod === 0) return Array(total / 4).fill(4);
    if (mod === 1) {
      const count4 = Math.floor((total - 9) / 4);
      if (count4 >= 0) return [...Array(count4).fill(4), 3, 3, 3];
    }
    if (mod === 2) {
      const count4 = Math.floor((total - 6) / 4);
      if (count4 >= 0) return [...Array(count4).fill(4), 3, 3];
    }
    if (mod === 3) {
      const count4 = Math.floor((total - 3) / 4);
      if (count4 >= 0) return [...Array(count4).fill(4), 3];
    }
    if (total === 5) return [3, 2];
    if (total === 3) return [3];
  }
  const count = Math.max(1, Math.floor(total / preferredSize));
  const baseCap = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }).map((_, idx) =>
    idx < remainder ? baseCap + 1 : baseCap,
  );
}

export function getCapacidadesZonasPorReglamento(
  total: number,
  reglamento?: string | null,
): number[] {
  const regl = String(reglamento || "FAP").toUpperCase();
  if (regl === "AMATEUR") {
    return getCapacidadesZonasPreferidas(total, 4);
  }
  return getCapacidadesZonasPreferidas(total, 3);
}
