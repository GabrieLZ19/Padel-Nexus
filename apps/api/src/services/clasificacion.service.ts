import { supabaseAdmin } from "../config/supabase";

interface EstadisticasPareja {
  inscripcionId: string;
  partidosJugados: number;
  partidosGanados: number;
  setsAFavor: number;
  setsEnContra: number;
  gamesAFavor: number;
  gamesEnContra: number;
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
        };
      }
    };

    // 3. ACUMULAMOS LOS RESULTADOS
    partidos.forEach((p) => {
      if (!p.equipo_a_id || !p.equipo_b_id) return;

      inicializarStats(p.equipo_a_id);
      inicializarStats(p.equipo_b_id);

      // Si hay un ganador registrado
      if (p.ganador) {
        stats[p.equipo_a_id].partidosJugados += 1;
        stats[p.equipo_b_id].partidosJugados += 1;
        stats[p.ganador].partidosGanados += 1;

        // Cálculos de Sets y Games
        // (Asumiendo que guardás los sets en formato JSON o columnas separadas set1_a, set1_b, set2_a, etc.
        // Aquí simplificamos la suma. Deberás adaptar esto según tu estructura exacta de sets)
        const aGanoSet1 = (p.set1_a || 0) > (p.set1_b || 0);
        const bGanoSet1 = (p.set1_b || 0) > (p.set1_a || 0);

        if (aGanoSet1) {
          stats[p.equipo_a_id].setsAFavor += 1;
          stats[p.equipo_b_id].setsEnContra += 1;
        }
        if (bGanoSet1) {
          stats[p.equipo_b_id].setsAFavor += 1;
          stats[p.equipo_a_id].setsEnContra += 1;
        }

        stats[p.equipo_a_id].gamesAFavor += p.set1_a || 0;
        stats[p.equipo_a_id].gamesEnContra += p.set1_b || 0;

        stats[p.equipo_b_id].gamesAFavor += p.set1_b || 0;
        stats[p.equipo_b_id].gamesEnContra += p.set1_a || 0;
      }
    });

    // 4. ORDENAMIENTO REGLAMENTARIO FAP CON DESEMPATES
    const tabla = Object.values(stats);

    const groups: Record<number, EstadisticasPareja[]> = {};
    tabla.forEach((team) => {
      const wins = team.partidosGanados;
      if (!groups[wins]) groups[wins] = [];
      groups[wins].push(team);
    });

    const sortedWins = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);

    const resultadoOrdenado: EstadisticasPareja[] = [];

    for (const wins of sortedWins) {
      const tiedTeams = groups[wins];
      
      if (tiedTeams.length === 2) {
        // Desempate Directo por confrontación entre sí (Regla FAP para 2 empatados)
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
