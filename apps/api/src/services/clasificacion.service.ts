import { supabaseAdmin } from "../config/supabase";

export interface EstadisticasPareja {
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
  ds: number;
  dg: number;
  descalificada: boolean;
  sorteoPosicion: number | null;
  sorteoMotivo: string | null;
  criterioDesempate?: string;
  requiereSorteo?: boolean;
  empateConIds?: string[];
}

interface PartidoDeZona {
  id?: string;
  equipo_a_id?: string | null;
  equipo_b_id?: string | null;
  ganador?: string | null;
  set1_a?: number | null;
  set1_b?: number | null;
  set2_a?: number | null;
  set2_b?: number | null;
  set3_a?: number | null;
  set3_b?: number | null;
  es_wo?: boolean | null;
  es_injustificado_wo?: boolean | null;
  es_lesion?: boolean | null;
  es_supertiebreak?: boolean | null;
}

/**
 * Desempate de 2 parejas según el reglamento oficial FAP:
 * 1. Sorteo reglamentario (si ya fue registrado en la base de datos).
 * 2. Resultado en cancha (confrontación directa entre ambas si se enfrentaron).
 * 3. Diferencia de sets (DS).
 * 4. Diferencia de games (DG).
 * 5. Games a favor (GF).
 * 6. Menor cantidad de games en contra (GC).
 * 7. Si persiste la igualdad absoluta: Requiere Sorteo Oficial.
 */
function desempatarDosEquipos(
  a: EstadisticasPareja,
  b: EstadisticasPareja,
  partidos: PartidoDeZona[],
): { ordenados: [EstadisticasPareja, EstadisticasPareja]; requiereSorteo: boolean } {
  // Si ambos ya tienen sorteo_posicion registrado y diferente
  if (
    a.sorteoPosicion != null &&
    b.sorteoPosicion != null &&
    a.sorteoPosicion !== b.sorteoPosicion
  ) {
    const orden = a.sorteoPosicion < b.sorteoPosicion ? [a, b] : [b, a];
    orden[0].criterioDesempate = "Sorteo reglamentario FAP";
    orden[1].criterioDesempate = "Sorteo reglamentario FAP";
    return {
      ordenados: orden as [EstadisticasPareja, EstadisticasPareja],
      requiereSorteo: false,
    };
  }

  // 1. Confrontación directa si jugaron entre sí
  const partidoDirecto = partidos.find(
    (p) =>
      (p.equipo_a_id === a.inscripcionId && p.equipo_b_id === b.inscripcionId) ||
      (p.equipo_a_id === b.inscripcionId && p.equipo_b_id === a.inscripcionId),
  );
  if (partidoDirecto && partidoDirecto.ganador) {
    const primero = partidoDirecto.ganador === a.inscripcionId ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Confrontación directa";
    segundo.criterioDesempate = "Confrontación directa";
    return { ordenados: [primero, segundo], requiereSorteo: false };
  }

  // 2. Diferencia de sets
  if (a.ds !== b.ds) {
    const primero = a.ds > b.ds ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Diferencia de sets";
    segundo.criterioDesempate = "Diferencia de sets";
    return { ordenados: [primero, segundo], requiereSorteo: false };
  }

  // 3. Diferencia de games
  if (a.dg !== b.dg) {
    const primero = a.dg > b.dg ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Diferencia de games";
    segundo.criterioDesempate = "Diferencia de games";
    return { ordenados: [primero, segundo], requiereSorteo: false };
  }

  // 4. Games a favor
  if (a.gamesAFavor !== b.gamesAFavor) {
    const primero = a.gamesAFavor > b.gamesAFavor ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Games a favor";
    segundo.criterioDesempate = "Games a favor";
    return { ordenados: [primero, segundo], requiereSorteo: false };
  }

  // 5. Menor cantidad de games en contra
  if (a.gamesEnContra !== b.gamesEnContra) {
    const primero = a.gamesEnContra < b.gamesEnContra ? a : b;
    const segundo = primero === a ? b : a;
    primero.criterioDesempate = "Menos games en contra";
    segundo.criterioDesempate = "Menos games en contra";
    return { ordenados: [primero, segundo], requiereSorteo: false };
  }

  // 6. Empate absoluto en todos los criterios reglamentarios
  // Si uno de los dos tiene sorteo_posicion definido
  if (
    a.sorteoPosicion != null &&
    b.sorteoPosicion != null &&
    a.sorteoPosicion !== b.sorteoPosicion
  ) {
    const orden = a.sorteoPosicion < b.sorteoPosicion ? [a, b] : [b, a];
    orden[0].criterioDesempate = "Sorteo reglamentario FAP";
    orden[1].criterioDesempate = "Sorteo reglamentario FAP";
    return {
      ordenados: orden as [EstadisticasPareja, EstadisticasPareja],
      requiereSorteo: false,
    };
  }

  a.requiereSorteo = true;
  b.requiereSorteo = true;
  a.empateConIds = [b.inscripcionId];
  b.empateConIds = [a.inscripcionId];
  a.criterioDesempate = "Empate absoluto - Requiere sorteo FAP";
  b.criterioDesempate = "Empate absoluto - Requiere sorteo FAP";
  return { ordenados: [a, b], requiereSorteo: true };
}

/**
 * Desempate de 3 o más parejas según el reglamento FAP.
 */
function desempatarMultiplesEquipos(
  teams: EstadisticasPareja[],
  partidos: PartidoDeZona[],
): { ordenados: EstadisticasPareja[]; requiereSorteo: boolean } {
  // Si todas tienen sorteo_posicion registrado y son distintos
  const allHaveSorteo = teams.every((t) => t.sorteoPosicion != null);
  if (allHaveSorteo) {
    const sorted = [...teams].sort(
      (a, b) => (a.sorteoPosicion || 0) - (b.sorteoPosicion || 0),
    );
    sorted.forEach((t) => (t.criterioDesempate = "Sorteo reglamentario FAP"));
    return { ordenados: sorted, requiereSorteo: false };
  }

  // Ordenar inicialmente por DS, DG, GF, y GC ascendente
  const sorted = [...teams].sort((a, b) => {
    if (b.ds !== a.ds) return b.ds - a.ds;
    if (b.dg !== a.dg) return b.dg - a.dg;
    if (b.gamesAFavor !== a.gamesAFavor) return b.gamesAFavor - a.gamesAFavor;
    return a.gamesEnContra - b.gamesEnContra;
  });

  const resultado: EstadisticasPareja[] = [];
  let i = 0;
  let algunSorteo = false;

  while (i < sorted.length) {
    let j = i + 1;
    while (
      j < sorted.length &&
      sorted[j].ds === sorted[i].ds &&
      sorted[j].dg === sorted[i].dg &&
      sorted[j].gamesAFavor === sorted[i].gamesAFavor &&
      sorted[j].gamesEnContra === sorted[i].gamesEnContra
    ) {
      j++;
    }

    const subgrupo = sorted.slice(i, j);
    if (subgrupo.length === 1) {
      subgrupo[0].criterioDesempate = "Estadística de sets/games";
      resultado.push(subgrupo[0]);
    } else if (subgrupo.length === 2) {
      const res2 = desempatarDosEquipos(subgrupo[0], subgrupo[1], partidos);
      if (res2.requiereSorteo) algunSorteo = true;
      resultado.push(...res2.ordenados);
    } else {
      // 3 o más en empate absoluto
      const allSorteo = subgrupo.every((t) => t.sorteoPosicion != null);
      if (allSorteo) {
        subgrupo.sort(
          (a, b) => (a.sorteoPosicion || 0) - (b.sorteoPosicion || 0),
        );
        subgrupo.forEach((t) => (t.criterioDesempate = "Sorteo reglamentario FAP"));
        resultado.push(...subgrupo);
      } else {
        algunSorteo = true;
        const ids = subgrupo.map((t) => t.inscripcionId);
        subgrupo.forEach((t) => {
          t.requiereSorteo = true;
          t.empateConIds = ids.filter((id) => id !== t.inscripcionId);
          t.criterioDesempate = "Empate absoluto - Requiere sorteo FAP";
        });
        resultado.push(...subgrupo);
      }
    }
    i = j;
  }

  return { ordenados: resultado, requiereSorteo: algunSorteo };
}

export class ClasificacionService {
  /**
   * Calcula la tabla de posiciones de una zona específica aplicando el reglamento oficial FAP
   */
  static async calcularPosicionesZona(
    torneoId: string,
    nombreZona: string,
    _capacidadZona?: number,
  ): Promise<EstadisticasPareja[]> {
    // 1. OBTENEMOS TODOS LOS PARTIDOS JUGADOS DE LA ZONA
    const { data: partidos, error } = await supabaseAdmin
      .from("partidos")
      .select("*")
      .eq("torneo_id", torneoId)
      .eq("ronda", nombreZona)
      .not("estado_partido", "eq", "Programado");

    if (error || !partidos) {
      throw new Error("Error al obtener los partidos de la zona.");
    }

    // 2. OBTENEMOS INFORMACIÓN DE GRUPO Y PAREJAS (incluyendo sorteos y descalificaciones)
    const { data: grupo } = await supabaseAdmin
      .from("grupos")
      .select(`
        id,
        nombre_grupo,
        grupo_parejas (
          id,
          inscripcion_id,
          descalificada,
          sorteo_posicion,
          sorteo_motivo,
          sorteo_aplicado_por,
          sorteo_aplicado_at
        )
      `)
      .eq("torneo_id", torneoId)
      .eq("nombre_grupo", nombreZona)
      .maybeSingle();

    const infoParejasMap: Record<
      string,
      {
        descalificada: boolean;
        sorteoPosicion: number | null;
        sorteoMotivo: string | null;
      }
    > = {};

    (grupo?.grupo_parejas || []).forEach((gp) => {
      infoParejasMap[gp.inscripcion_id] = {
        descalificada: Boolean(gp.descalificada),
        sorteoPosicion: gp.sorteo_posicion ?? null,
        sorteoMotivo: gp.sorteo_motivo ?? null,
      };
    });

    // 3. INICIALIZAMOS DICCIONARIO DE ESTADÍSTICAS
    const stats: Record<string, EstadisticasPareja> = {};

    const inicializarStats = (id: string) => {
      if (!stats[id]) {
        const info = infoParejasMap[id];
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
          ds: 0,
          dg: 0,
          descalificada: info?.descalificada ?? false,
          sorteoPosicion: info?.sorteoPosicion ?? null,
          sorteoMotivo: info?.sorteoMotivo ?? null,
          requiereSorteo: false,
        };
      }
    };

    // Aseguramos que todas las parejas asignadas a la zona estén inicializadas
    Object.keys(infoParejasMap).forEach((id) => inicializarStats(id));

    // 4. ACUMULAMOS LOS RESULTADOS
    partidos.forEach((p) => {
      if (!p.equipo_a_id || !p.equipo_b_id) return;

      inicializarStats(p.equipo_a_id);
      inicializarStats(p.equipo_b_id);

      if (p.ganador) {
        stats[p.equipo_a_id].partidosJugados += 1;
        stats[p.equipo_b_id].partidosJugados += 1;
        stats[p.ganador].partidosGanados += 1;

        const processStats = (isTeamA: boolean, teamId: string) => {
          if (p.es_wo && !p.es_lesion) {
            if (p.ganador === teamId) {
              stats[teamId].setsAFavor += 2;
              stats[teamId].gamesAFavor += 12;
              stats[teamId].puntosTotales += 2;
            } else {
              stats[teamId].setsEnContra += 2;
              stats[teamId].gamesEnContra += 12;
              stats[teamId].puntosTotales += p.es_injustificado_wo ? 0 : 1;
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
            const aWon = Number(p.set1_a) > Number(p.set1_b);
            if (isTeamA) {
              if (aWon) sF++; else sC++;
              gF += Number(p.set1_a);
              gC += Number(p.set1_b);
            } else {
              if (!aWon) sF++; else sC++;
              gF += Number(p.set1_b);
              gC += Number(p.set1_a);
            }
          }

          // Set 2
          if (p.set2_a !== null && p.set2_b !== null) {
            const aWon = Number(p.set2_a) > Number(p.set2_b);
            if (isTeamA) {
              if (aWon) sF++; else sC++;
              gF += Number(p.set2_a);
              gC += Number(p.set2_b);
            } else {
              if (!aWon) sF++; else sC++;
              gF += Number(p.set2_b);
              gC += Number(p.set2_a);
            }
          }

          // Set 3 o Supertiebreak
          if (p.set3_a !== null && p.set3_b !== null) {
            const aWon = Number(p.set3_a) > Number(p.set3_b);
            if (isTeamA) {
              if (aWon) sF++; else sC++;
              if (p.es_supertiebreak) {
                if (aWon) stbW++; else stbL++;
              } else {
                gF += Number(p.set3_a);
                gC += Number(p.set3_b);
              }
            } else {
              if (!aWon) sF++; else sC++;
              if (p.es_supertiebreak) {
                if (!aWon) stbW++; else stbL++;
              } else {
                gF += Number(p.set3_b);
                gC += Number(p.set3_a);
              }
            }
          }

          stats[teamId].setsAFavor += sF;
          stats[teamId].setsEnContra += sC;
          stats[teamId].gamesAFavor += gF;
          stats[teamId].gamesEnContra += gC;
          stats[teamId].stbGanados += stbW;
          stats[teamId].stbPerdidos += stbL;
          stats[teamId].puntosTotales += p.ganador === teamId ? 2 : 1;
        };

        processStats(true, p.equipo_a_id);
        processStats(false, p.equipo_b_id);
      }
    });

    // 5. CALCULAR DIFERENCIAS (DS, DG)
    const tabla = Object.values(stats).map((st) => ({
      ...st,
      ds: st.setsAFavor - st.setsEnContra,
      dg: st.gamesAFavor - st.gamesEnContra,
    }));

    // Separar habilitadas de descalificadas
    const habilitadas = tabla.filter((t) => !t.descalificada);
    const descalificadas = tabla.filter((t) => t.descalificada);

    // 6. ORDENAMIENTO REGLAMENTARIO FAP POR PUNTOS Y DESEMPATES
    const groups: Record<number, EstadisticasPareja[]> = {};
    habilitadas.forEach((team) => {
      const pts = team.puntosTotales;
      if (!groups[pts]) groups[pts] = [];
      groups[pts].push(team);
    });

    const sortedPts = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a);

    const resultadoHabilitadas: EstadisticasPareja[] = [];

    for (const pts of sortedPts) {
      const tiedTeams = groups[pts];

      if (tiedTeams.length === 1) {
        tiedTeams[0].criterioDesempate = "Puntos directos";
        resultadoHabilitadas.push(tiedTeams[0]);
      } else if (tiedTeams.length === 2) {
        const { ordenados } = desempatarDosEquipos(
          tiedTeams[0],
          tiedTeams[1],
          partidos,
        );
        resultadoHabilitadas.push(...ordenados);
      } else {
        const { ordenados } = desempatarMultiplesEquipos(tiedTeams, partidos);
        resultadoHabilitadas.push(...ordenados);
      }
    }

    return [...resultadoHabilitadas, ...descalificadas];
  }

  /**
   * Resuelve y audita el sorteo reglamentario o manual de un grupo/zona FAP.
   */
  static async resolverSorteoZona(
    torneoId: string,
    nombreZona: string,
    resoluciones: Array<{ inscripcionId: string; posicion: number }>,
    motivo?: string,
    metodo: "digital" | "manual" = "manual",
    usuarioId?: string,
  ): Promise<EstadisticasPareja[]> {
    const { data: grupo, error: errGrupo } = await supabaseAdmin
      .from("grupos")
      .select("id, nombre_grupo")
      .eq("torneo_id", torneoId)
      .eq("nombre_grupo", nombreZona)
      .maybeSingle();

    if (errGrupo || !grupo) {
      throw new Error(`Zona "${nombreZona}" no encontrada en el torneo.`);
    }

    if (!resoluciones || resoluciones.length < 2) {
      throw new Error(
        "Se requieren al menos 2 parejas para resolver un sorteo reglamentario.",
      );
    }

    const appliedAt = new Date().toISOString();
    const motivoFinal =
      motivo?.trim() ||
      (metodo === "digital"
        ? "Sorteo digital reglamentario en sistema FAP"
        : "Sorteo presencial en mesa de control");

    for (const res of resoluciones) {
      const { error: errUpd } = await supabaseAdmin
        .from("grupo_parejas")
        .update({
          sorteo_posicion: res.posicion,
          sorteo_motivo: motivoFinal,
          sorteo_aplicado_por: usuarioId || null,
          sorteo_aplicado_at: appliedAt,
        })
        .eq("grupo_id", grupo.id)
        .eq("inscripcion_id", res.inscripcionId);

      if (errUpd) {
        throw new Error(
          `Error al actualizar sorteo para pareja ${res.inscripcionId}: ${errUpd.message}`,
        );
      }
    }

    // Registrar en logs_auditoria para trazabilidad estricta
    await supabaseAdmin.from("logs_auditoria").insert({
      usuario_id_admin: usuarioId || null,
      accion: "RESOLUCION_SORTEO_ZONA",
      entidad_afectada: "grupo_parejas",
      detalles: {
        torneo_id: torneoId,
        nombre_grupo: nombreZona,
        grupo_id: grupo.id,
        metodo,
        motivo: motivoFinal,
        resoluciones,
        timestamp: appliedAt,
      },
    });

    // Intentar sincronizar clasificados a llave de playoff
    try {
      const { sincronizarClasificadosALlave } = await import(
        "../utils/playoffAvance"
      );
      await sincronizarClasificadosALlave(torneoId);
    } catch (e) {
      console.warn(
        "[ClasificacionService] Advertencia sincronizando clasificados a llave tras sorteo:",
        e,
      );
    }

    return this.calcularPosicionesZona(torneoId, nombreZona);
  }
}
