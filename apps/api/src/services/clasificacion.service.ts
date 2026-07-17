import { supabaseAdmin } from "../config/supabase";

interface EstadisticasPareja {
  inscripcionId: string;
  partidosJugados: number;
  partidosGanados: number;
  setsAFavor: number;
  setsEnContra: number;
  gamesAFavor: number;
  gamesEnContra: number;
  stbGanados: number;
  stbPerdidos: number;
  puntosTotales: number;
}

export class ClasificacionService {
  /**
   * Calcula la tabla de posiciones de una zona específica
   */
  static async calcularPosicionesZona(
    torneoId: string,
    nombreZona: string,
    capacidadZona: number,
  ) {
    // 1. OBTENEMOS TODOS LOS PARTIDOS JUGADOS DE LA ZONA
    const { data: partidos, error } = await supabaseAdmin
      .from("partidos")
      .select("*")
      .eq("torneo_id", torneoId)
      .eq("ronda", nombreZona)
      .not("estado_partido", "eq", "Programado"); // Solo partidos finalizados o en W.O.

    if (error || !partidos)
      throw new Error("Error al obtener los partidos de la zona.");

    // 2. INICIALIZAMOS DICCIONARIO DE ESTADÍSTICAS
    const stats: Record<string, EstadisticasPareja> = {};

    const inicializarStats = (id: string) => {
      if (!stats[id]) {
        stats[id] = {
          inscripcionId: id,
          partidosJugados: 0,
          partidosGanados: 0,
          setsAFavor: 0,
          setsEnContra: 0,
          gamesAFavor: 0,
          gamesEnContra: 0,
          stbGanados: 0,
          stbPerdidos: 0,
          puntosTotales: 0,
        };
      }
    };

    // 3. ACUMULAMOS LOS RESULTADOS
    partidos.forEach((p) => {
      if (!p.equipo_a_id || !p.equipo_b_id) return;

      inicializarStats(p.equipo_a_id);
      inicializarStats(p.equipo_b_id);

      if (p.ganador) {
        stats[p.equipo_a_id].partidosJugados += 1;
        stats[p.equipo_b_id].partidosJugados += 1;
        stats[p.ganador].partidosGanados += 1;

        const processStats = (isTeamA: boolean, teamId: string) => {
          if (p.es_wo) {
            if (p.ganador === teamId) {
              stats[teamId].setsAFavor += 2;
              stats[teamId].gamesAFavor += 12;
              stats[teamId].puntosTotales += 2;
            } else {
              stats[teamId].setsEnContra += 2;
              stats[teamId].gamesEnContra += 12;
              stats[teamId].puntosTotales += 0; // WO perdedor obtiene 0 puntos
            }
            return;
          }

          let sF = 0;
          let sC = 0;
          let gF = 0;
          let gC = 0;
          let stbW = 0;
          let stbL = 0;

          // Set 1
          if (p.set1_a !== null && p.set1_b !== null) {
            const aWon = p.set1_a > p.set1_b;
            if (isTeamA) {
              if (aWon) sF++; else sC++;
              gF += p.set1_a;
              gC += p.set1_b;
            } else {
              if (!aWon) sF++; else sC++;
              gF += p.set1_b;
              gC += p.set1_a;
            }
          }

          // Set 2
          if (p.set2_a !== null && p.set2_b !== null) {
            const aWon = p.set2_a > p.set2_b;
            if (isTeamA) {
              if (aWon) sF++; else sC++;
              gF += p.set2_a;
              gC += p.set2_b;
            } else {
              if (!aWon) sF++; else sC++;
              gF += p.set2_b;
              gC += p.set2_a;
            }
          }

          // Set 3 o Supertiebreak
          if (p.set3_a !== null && p.set3_b !== null) {
            const aWon = p.set3_a > p.set3_b;
            if (isTeamA) {
              if (aWon) sF++; else sC++;
              if (p.es_supertiebreak) {
                if (aWon) stbW++; else stbL++;
              } else {
                gF += p.set3_a;
                gC += p.set3_b;
              }
            } else {
              if (!aWon) sF++; else sC++;
              if (p.es_supertiebreak) {
                if (!aWon) stbW++; else stbL++;
              } else {
                gF += p.set3_b;
                gC += p.set3_a;
              }
            }
          }

          stats[teamId].setsAFavor += sF;
          stats[teamId].setsEnContra += sC;
          stats[teamId].gamesAFavor += gF;
          stats[teamId].gamesEnContra += gC;
          stats[teamId].stbGanados += stbW;
          stats[teamId].stbPerdidos += stbL;
          stats[teamId].puntosTotales += (p.ganador === teamId) ? 2 : 1;
        };

        processStats(true, p.equipo_a_id);
        processStats(false, p.equipo_b_id);
      }
    });

    // 4. ORDENAMIENTO REGLAMENTARIO CON DESEMPATES
    const tabla = Object.values(stats);

    const groups: Record<number, EstadisticasPareja[]> = {};
    tabla.forEach((team) => {
      const pts = team.puntosTotales;
      if (!groups[pts]) groups[pts] = [];
      groups[pts].push(team);
    });

    const sortedPts = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);

    const resultadoOrdenado: EstadisticasPareja[] = [];

    for (const pts of sortedPts) {
      const tiedTeams = groups[pts];
      
      if (tiedTeams.length === 2) {
        // Desempate Directo por confrontación entre sí (Regla FAP/APA para 2 empatados)
        const a = tiedTeams[0];
        const b = tiedTeams[1];
        const partidoDirecto = partidos.find(
          (p) =>
            (p.equipo_a_id === a.inscripcionId && p.equipo_b_id === b.inscripcionId) ||
            (p.equipo_a_id === b.inscripcionId && p.equipo_b_id === a.inscripcionId)
        );
        if (partidoDirecto && partidoDirecto.ganador) {
          if (partidoDirecto.ganador === a.inscripcionId) {
            resultadoOrdenado.push(a, b);
          } else {
            resultadoOrdenado.push(b, a);
          }
        } else {
          resultadoOrdenado.push(a, b);
        }
      } else if (tiedTeams.length >= 3) {
        // Desempate para triple empate (sets, games a favor, games en contra)
        tiedTeams.sort((a, b) => {
          const difSetA = a.setsAFavor - a.setsEnContra;
          const difSetB = b.setsAFavor - b.setsEnContra;
          if (difSetA !== difSetB) return difSetB - difSetA;

          const difGameA = a.gamesAFavor - a.gamesEnContra;
          const difGameB = b.gamesAFavor - b.gamesEnContra;
          if (difGameA !== difGameB) return difGameB - difGameA;

          if (a.gamesAFavor !== b.gamesAFavor) return b.gamesAFavor - a.gamesAFavor;
          if (a.gamesEnContra !== b.gamesEnContra) return a.gamesEnContra - b.gamesEnContra;
          return 0;
        });
        resultadoOrdenado.push(...tiedTeams);
      } else {
        resultadoOrdenado.push(...tiedTeams);
      }
    }

    return resultadoOrdenado;
  }
}
