/**
 * Color de cada game en el marcador de zona.
 * El perdedor no usa blanco con opacidad: en modo claro ese blanco
 * queda sobre fondo claro y el número desaparece.
 */
export function clasePuntosSet(jugado: boolean, ganoElSet: boolean): string {
  if (!jugado) return "text-gray-500";
  if (ganoElSet) return "text-brand-chartreuse";
  return "text-gray-300";
}

/** Superficies del resultado finalizado. Usan tokens que el modo claro ya invierte. */
export function clasesResultadoFinalizado(ganoElSet: boolean): {
  fila: string;
  panel: string;
  puntos: string;
} {
  return {
    fila: "bg-brand-card border-brand-input",
    panel: "bg-brand-input border-brand-input",
    puntos: ganoElSet
      ? "bg-brand-chartreuse text-brand-black border-brand-chartreuse"
      : "bg-brand-card text-gray-300 border-brand-input",
  };
}
