export type PartidoZonaPareja = {
  orden: number;
  finalizado: boolean;
  esWo: boolean;
  esLesion: boolean;
  gano: boolean;
};

/**
 * W.O. sin inicio (no presentación o lesión previa) en el segundo partido
 * de zona de la pareja: queda descalificada.
 * El retiro con marcador (lesión durante el partido) no descalifica.
 */
export function debeDescalificarPorWoDeZona(
  partidos: PartidoZonaPareja[],
): boolean {
  const jugados = partidos
    .filter((p) => p.finalizado)
    .sort((a, b) => a.orden - b.orden);
  const segundo = jugados[1];
  if (!segundo) return false;
  return segundo.esWo && !segundo.esLesion && !segundo.gano;
}
