/**
 * Puntos de provincia en torneos de alcance nacional.
 * Se suman desde octavos: 8 campeón, 6 finalista, 4 semis, 2 cuartos, 1 octavos.
 * Dieciseisavos y treintaidosavos no suman.
 */
export function puntosDeRondaProvincial(
  ronda: string,
  lado: "ganador" | "perdedor",
): number {
  const u = ronda.trim().toUpperCase();
  if (u === "FINAL") return lado === "ganador" ? 8 : 6;
  if (u === "SEMIS" || u === "SEMIFINAL" || u === "SEMIFINALES") {
    return lado === "perdedor" ? 4 : 0;
  }
  if (u === "CUARTOS") return lado === "perdedor" ? 2 : 0;
  if (u === "OCTAVOS") return lado === "perdedor" ? 1 : 0;
  return 0;
}

export type ResultadoInstancia = {
  ronda: string;
  ganadorId: string;
  perdedorId: string | null;
};

/**
 * Cada pareja se queda con los puntos de su mejor instancia.
 * El campeón no suma también los de las rondas anteriores.
 */
export function puntosInscripcionPorMejorInstancia(
  partidos: ResultadoInstancia[],
): Map<string, number> {
  const peso = (ronda: string) => {
    const u = ronda.trim().toUpperCase();
    if (u === "FINAL") return 5;
    if (u.startsWith("SEMI")) return 4;
    if (u === "CUARTOS") return 3;
    if (u === "OCTAVOS") return 2;
    return 0;
  };

  const puntos = new Map<string, number>();
  const mejor = new Map<string, number>();

  const aplicar = (id: string | null, ronda: string, pts: number) => {
    if (!id || pts <= 0) return;
    const rank = peso(ronda);
    if (rank === 0) return;
    const previo = mejor.get(id) || 0;
    if (rank < previo) return;
    if (rank > previo || pts > (puntos.get(id) || 0)) {
      mejor.set(id, rank);
      puntos.set(id, pts);
    }
  };

  for (const partido of partidos) {
    aplicar(
      partido.ganadorId,
      partido.ronda,
      puntosDeRondaProvincial(partido.ronda, "ganador"),
    );
    aplicar(
      partido.perdedorId,
      partido.ronda,
      puntosDeRondaProvincial(partido.ronda, "perdedor"),
    );
  }

  return puntos;
}
