import { supabaseAdmin } from "../config/supabase";
import {
  FAP_ESTADOS_PAGO,
  FAP_ESTADOS_TORNEO,
  FAP_REGLAS,
} from "../constants/fap";

export interface FiltrosTorneo {
  search?: string;
  estado?: string;
}

export interface TorneoPayload {
  nombre: string;
  subtitulo?: string;
  club_id: string;
  fecha: string;
  estado: string;
  cupos_maximos: number;
  nivel: string;
  categoria: string;
  modalidad: string;
  precio_inscripcion: number;
  formato: string;
  premios?: { uno?: string; dos?: string; tres?: string };
}

export class TorneoService {
  // Helper para calcular estado dinámico (Cierre automático)
  private static evaluateDynamicState(torneo: any) {
    if (
      (torneo.estado === FAP_ESTADOS_TORNEO.INSCRIPCION ||
        torneo.estado === FAP_ESTADOS_TORNEO.CERRADO) &&
      torneo.fecha
    ) {
      const fechaTorneo = new Date(torneo.fecha);
      fechaTorneo.setHours(0, 0, 0, 0);
      const fechaActual = new Date();
      fechaActual.setHours(0, 0, 0, 0);

      const diasFaltantes = Math.ceil(
        (fechaTorneo.getTime() - fechaActual.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diasFaltantes < FAP_REGLAS.DIAS_CIERRE_INSCRIPCION) {
        torneo.estado = FAP_ESTADOS_TORNEO.CERRADO;
      } else {
        torneo.estado = FAP_ESTADOS_TORNEO.INSCRIPCION;
      }
    }
    return torneo;
  }

  static async listarTorneos(
    page?: number,
    limit: number = 10,
    filtros?: FiltrosTorneo,
  ) {
    let query = supabaseAdmin
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`, {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (filtros?.search) query = query.ilike("nombre", `%${filtros.search}%`);

    if (filtros?.estado) {
      const estados = filtros.estado
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      
      // Si piden "Cerrado", buscamos también los de "Inscripción" para poder aplicarles la regla dinámica
      const dbEstados = estados.includes(FAP_ESTADOS_TORNEO.CERRADO) && !estados.includes(FAP_ESTADOS_TORNEO.INSCRIPCION) 
        ? [...estados, FAP_ESTADOS_TORNEO.INSCRIPCION]
        : estados;

      if (dbEstados.length === 1) query = query.eq("estado", dbEstados[0]);
      else if (dbEstados.length > 1) query = query.in("estado", dbEstados);
    }

    type DbTorneo = Record<string, any> & {
      cupos_actuales?: number;
      cupos_maximos?: number;
    };

    let data;
    let count = 0;

    if (page !== undefined) {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      const result = await query.range(from, to);
      data = result.data;
      count = result.count || 0;
      if (result.error) throw new Error(result.error.message);
    } else {
      const result = await query.limit(limit);
      data = result.data;
      if (result.error) throw new Error(result.error.message);
    }

    let formatted = ((data as DbTorneo[]) || []).map((t) =>
      TorneoService.evaluateDynamicState({
        ...t,
        cupos_actuales: t.cupos_actuales || 0,
        cupos_maximos: t.cupos_maximos || 0,
      }),
    );

    // Si filtraron específicamente por estado en el query string, volver a filtrar en memoria por si el estado dinámico lo cambió
    if (filtros?.estado) {
      const requestedStates = filtros.estado.split(",").map(s => s.trim());
      formatted = formatted.filter(t => requestedStates.includes(t.estado));
    }

    return { data: formatted, total: count, paginated: page !== undefined };
  }

  static async obtenerPorId(id: string) {
    const { data, error } = await supabaseAdmin
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`)
      .eq("id", id)
      .single();

    if (error || !data) throw new Error("Torneo no encontrado.");
    return TorneoService.evaluateDynamicState(data);
  }

  static async crearTorneo(datos: TorneoPayload) {
    const payload = TorneoService.evaluateDynamicState({ ...datos });

    const { data: torneo, error: torneoError } = await supabaseAdmin
      .from("torneos")
      .insert([
        {
          nombre: payload.nombre,
          subtitulo: payload.subtitulo,
          club_id: payload.club_id,
          fecha: payload.fecha,
          estado: payload.estado,
          cupos_maximos: datos.cupos_maximos,
          cupos_actuales: 0,
          nivel: datos.nivel,
          categoria: datos.categoria,
          modalidad: datos.modalidad,
          precio_inscripcion: datos.precio_inscripcion,
          formato: datos.formato,
          premio_1: datos.premios?.uno,
          premio_2: datos.premios?.dos,
          premio_3: datos.premios?.tres,
        },
      ])
      .select()
      .single();

    if (torneoError || !torneo)
      throw new Error(`Error al crear torneo: ${torneoError?.message}`);

    const { error: cuadroError } = await supabaseAdmin.from("cuadros").insert([
      {
        torneo_id: torneo.id,
        fase: "Fase Inicial",
        configuracion: {
          formato: datos.formato,
          estado: "esperando_inscripciones",
        },
      },
    ]);

    if (cuadroError)
      throw new Error(`Error al inicializar el cuadro: ${cuadroError.message}`);
    return torneo;
  }

  static async actualizarTorneo(id: string, datos: any) {
    const { data: torneoActual } = await supabaseAdmin
      .from("torneos")
      .select("estado, fecha")
      .eq("id", id)
      .single();

    const updateData: Record<string, any> = { ...datos };

    if (torneoActual) {
      const mergedForEval = { ...torneoActual, ...updateData };
      const evaluated = TorneoService.evaluateDynamicState(mergedForEval);
      if (evaluated.estado) {
        updateData.estado = evaluated.estado;
      }
    }

    if (datos.premios) {
      updateData.premio_1 = datos.premios.uno;
      updateData.premio_2 = datos.premios.dos;
      updateData.premio_3 = datos.premios.tres;
      delete updateData.premios;
    }

    const { data, error } = await supabaseAdmin
      .from("torneos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data)
      throw new Error(`Error al actualizar: ${error?.message}`);
    return data;
  }

  static async eliminarTorneo(id: string) {
    const { error } = await supabaseAdmin.from("torneos").delete().eq("id", id);
    if (error)
      throw new Error(`No se pudo eliminar el torneo: ${error.message}`);
  }

  static async obtenerInscripciones(id: string) {
    const { data, error } = await supabaseAdmin
      .from("inscripciones")
      .select("*")
      .eq("torneo_id", id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  static async obtenerPartidosFormateados(id: string) {
    const { data: partidos, error: partidosError } = await supabaseAdmin
      .from("partidos")
      .select("*")
      .eq("torneo_id", id)
      .order("orden", { ascending: true });

    if (partidosError) throw new Error(partidosError.message);

    const { data: inscripciones, error: insError } = await supabaseAdmin
      .from("inscripciones")
      .select("id, jugador1_nombre, jugador2_nombre")
      .eq("torneo_id", id);

    if (insError) throw new Error(insError.message);

    const insMap = new Map<
      string,
      { jugador1_nombre: string | null; jugador2_nombre: string | null }
    >();
    (inscripciones || []).forEach((ins) => insMap.set(ins.id, ins));

    return (partidos || []).map((p) => {
      const equipoA = p.equipo_a_id ? insMap.get(p.equipo_a_id) : null;
      const equipoB = p.equipo_b_id ? insMap.get(p.equipo_b_id) : null;

      return {
        ...p,
        equipo_a_j1: equipoA ? equipoA.jugador1_nombre : null,
        equipo_a_j2: equipoA ? equipoA.jugador2_nombre : null,
        equipo_b_j1: equipoB ? equipoB.jugador1_nombre : null,
        equipo_b_j2: equipoB ? equipoB.jugador2_nombre : null,
      };
    });
  }

  static async generarCuadroEliminatoria(id: string) {
    const { data: torneo, error: torneoError } = await supabaseAdmin
      .from("torneos")
      .select("formato, cupos_maximos")
      .eq("id", id)
      .single();

    if (torneoError || !torneo) throw new Error("Torneo no encontrado");

    const { data: inscripciones, error: inscError } = await supabaseAdmin
      .from("inscripciones")
      .select("id, usuario_id")
      .eq("torneo_id", id)
      .eq("estado_pago", FAP_ESTADOS_PAGO.CONFIRMADO);

    if (
      inscError ||
      !inscripciones ||
      inscripciones.length < FAP_REGLAS.CUPOS_MINIMOS_LLUAVES
    ) {
      throw new Error("Se necesitan al menos 4 inscritos confirmados.");
    }

    await supabaseAdmin.from("partidos").delete().eq("torneo_id", id);

    const shuffled = [...inscripciones].sort(() => 0.5 - Math.random());
    const partidos: Record<string, any>[] = [];
    let orden = 1;

    if (torneo.formato === "Eliminatoria Directa") {
      const cupos = torneo.cupos_maximos || 16;
      const roundsConfig = [
        { name: "32AVOS", matches: 32 },
        { name: "16AVOS", matches: 16 },
        { name: "OCTAVOS", matches: 8 },
        { name: "CUARTOS", matches: 4 },
        { name: "SEMIS", matches: 2 },
        { name: "FINAL", matches: 1 },
      ];

      const startIndex = roundsConfig.findIndex((r) => r.matches === cupos / 2);
      if (startIndex === -1)
        throw new Error("Cantidad de cupos inválida para generar cuadro.");

      for (let i = startIndex; i < roundsConfig.length; i++) {
        const round = roundsConfig[i];
        for (let j = 0; j < round.matches; j++) {
          let equipo_a_id = null;
          let equipo_b_id = null;

          if (i === startIndex) {
            equipo_a_id = shuffled[j * 2]?.id || null;
            equipo_b_id = shuffled[j * 2 + 1]?.id || null;
          }

          partidos.push({
            torneo_id: id,
            equipo_a_id,
            equipo_b_id,
            ronda: round.name,
            orden: orden++,
            estado_partido: "Programado",
          });
        }
      }
    }

    const { error: insertError } = await supabaseAdmin
      .from("partidos")
      .insert(partidos);
    if (insertError) throw new Error(insertError.message);

    await supabaseAdmin
      .from("torneos")
      .update({ estado: FAP_ESTADOS_TORNEO.EN_CURSO })
      .eq("id", id);
    return partidos.length;
  }

  static async procesarResultadoYAvance(
    partidoId: string,
    ganadorId: string,
    set1A: number,
    set1B: number,
  ) {
    const { data: partido, error: updateError } = await supabaseAdmin
      .from("partidos")
      .update({
        ganador: ganadorId,
        set1_a: set1A,
        set1_b: set1B,
        estado_partido: FAP_ESTADOS_TORNEO.FINALIZADO,
      })
      .eq("id", partidoId)
      .select("id, torneo_id, ronda, orden, equipo_a_id, equipo_b_id")
      .single();

    if (updateError || !partido)
      throw new Error("Error al cargar el marcador.");

    const perdedorId =
      ganadorId === partido.equipo_a_id
        ? partido.equipo_b_id
        : partido.equipo_a_id;

    const { data: torneoInfo } = await supabaseAdmin
      .from("torneos")
      .select("nivel, categoria, modalidad")
      .eq("id", partido.torneo_id)
      .single();

    if (torneoInfo) {
      const TABLA_PUNTOS: Record<
        string,
        { ganador: number; perdedor: number }
      > = {
        "16AVOS": { ganador: 45, perdedor: 10 },
        OCTAVOS: { ganador: 90, perdedor: 45 },
        CUARTOS: { ganador: 180, perdedor: 90 },
        SEMIS: { ganador: 360, perdedor: 180 },
        FINAL: { ganador: 1000, perdedor: 600 },
      };

      const rondaNormalizada = partido.ronda.toUpperCase().trim();
      const puntosRonda = TABLA_PUNTOS[rondaNormalizada];

      const otorgarPuntosAInscripcion = async (
        inscripcionId: string | null,
        puntos: number,
        esGanador: boolean,
      ) => {
        if (!inscripcionId) return;
        const { data: ins } = await supabaseAdmin
          .from("inscripciones")
          .select("usuario_id, usuario2_id")
          .eq("id", inscripcionId)
          .single();
        if (!ins) return;

        const ids = [ins.usuario_id, ins.usuario2_id].filter(Boolean);
        for (const uid of ids) {
          const { data: rank } = await supabaseAdmin
            .from("rankings")
            .select("puntos, pj, pg")
            .eq("usuario_id", uid)
            .eq("categoria", torneoInfo.nivel)
            .maybeSingle();

          const pAnt = rank?.puntos || 0;
          const pjAnt = rank?.pj || 0;
          const pgAnt = rank?.pg || 0;

          await supabaseAdmin.from("rankings").upsert(
            {
              usuario_id: uid,
              categoria: torneoInfo.nivel,
              rama: torneoInfo.categoria,
              puntos: pAnt + puntos,
              pj: pjAnt + 1,
              pg: esGanador ? pgAnt + 1 : pgAnt,
            },
            { onConflict: "id" }, // Ajustado a id por consistencia estructural
          );

          if (puntos > 0) {
            await supabaseAdmin.from("historial_ranking").insert([
              {
                usuario_id: uid,
                torneo_id: partido.torneo_id,
                puntos_anteriores: pAnt,
                puntos_nuevos: pAnt + puntos,
              },
            ]);
          }
        }
      };

      await otorgarPuntosAInscripcion(
        perdedorId,
        puntosRonda?.perdedor || 0,
        false,
      );
      await otorgarPuntosAInscripcion(
        ganadorId,
        puntosRonda?.ganador || 0,
        true,
      );
    }

    if (partido.ronda.toUpperCase() === "FINAL") {
      await supabaseAdmin
        .from("torneos")
        .update({ estado: FAP_ESTADOS_TORNEO.FINALIZADO })
        .eq("id", partido.torneo_id);
    } else {
      const rondasSiguientes: Record<string, string> = {
        "16AVOS": "OCTAVOS",
        OCTAVOS: "CUARTOS",
        CUARTOS: "SEMIS",
        SEMIS: "FINAL",
      };
      const rondaSiguiente =
        rondasSiguientes[partido.ronda.toUpperCase().trim()];

      if (rondaSiguiente) {
        const { data: pact } = await supabaseAdmin
          .from("partidos")
          .select("id")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", partido.ronda)
          .order("orden", { ascending: true });
        const { data: psig } = await supabaseAdmin
          .from("partidos")
          .select("id")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", rondaSiguiente)
          .order("orden", { ascending: true });

        if (pact && psig) {
          const miIndice = pact.findIndex((p) => p.id === partido.id);
          const idxHijo = Math.floor(miIndice / 2);
          const partidoDestino = psig[idxHijo];

          if (partidoDestino) {
            const ranura = miIndice % 2 === 0 ? "equipo_a_id" : "equipo_b_id";
            await supabaseAdmin
              .from("partidos")
              .update({ [ranura]: ganadorId })
              .eq("id", partidoDestino.id);
          }
        }
      }
    }

    // Si el partido finalizado es de zona (ej. "Zona A"), verificar avance automático
    if (partido.ronda.toUpperCase().startsWith("ZONA")) {
      const { data: allGroupMatches } = await supabaseAdmin
        .from("partidos")
        .select("id, ronda, ganador, equipo_a_id, equipo_b_id, set1_a, set1_b")
        .eq("torneo_id", partido.torneo_id)
        .ilike("ronda", "Zona %");

      const pendingCount = allGroupMatches?.filter((p) => p.ganador === null).length || 0;

      if (pendingCount === 0 && allGroupMatches && allGroupMatches.length > 0) {
        await avanzarJugadoresALlaves(partido.torneo_id, allGroupMatches);
      }
    }
  }
}

async function avanzarJugadoresALlaves(torneoId: string, groupMatches: any[]) {
  // 1. Obtener grupos y sus integrantes
  const { data: grupos } = await supabaseAdmin
    .from("grupos")
    .select("id, nombre_grupo, grupo_parejas(inscripcion_id)")
    .eq("torneo_id", torneoId)
    .order("nombre_grupo");
    
  if (!grupos) return;
  
  // 2. Calcular tabla de posiciones de cada grupo
  const standingsByGroup: Record<string, { id: string, points: number, diffSets: number }[]> = {};
  
  for (const g of grupos) {
    const parejas = g.grupo_parejas || [];
    const stats = parejas.map((p: any) => {
      let points = 0;
      let diffSets = 0;
      let diffGames = 0;
      let gamesAFavor = 0;
      let gamesEnContra = 0;
      
      groupMatches.forEach((m) => {
        if (m.ronda === g.nombre_grupo && m.ganador) {
          if (m.equipo_a_id === p.inscripcion_id) {
            const setsWon = Number(m.set1_a || 0);
            const setsLost = Number(m.set1_b || 0);
            diffSets += (setsWon - setsLost);
            diffGames += (setsWon - setsLost);
            gamesAFavor += setsWon;
            gamesEnContra += setsLost;
            if (m.ganador === p.inscripcion_id) {
              points += 2;
            } else {
              points += 1;
            }
          } else if (m.equipo_b_id === p.inscripcion_id) {
            const setsWon = Number(m.set1_b || 0);
            const setsLost = Number(m.set1_a || 0);
            diffSets += (setsWon - setsLost);
            diffGames += (setsWon - setsLost);
            gamesAFavor += setsWon;
            gamesEnContra += setsLost;
            if (m.ganador === p.inscripcion_id) {
              points += 2;
            } else {
              points += 1;
            }
          }
        }
      });
      return { id: p.inscripcion_id, points, diffSets, diffGames, gamesAFavor, gamesEnContra };
    });
    
    // Group and sort using FAP tie-breaker rules
    const groupsMap: Record<number, any[]> = {};
    stats.forEach((team) => {
      const pts = team.points;
      if (!groupsMap[pts]) groupsMap[pts] = [];
      groupsMap[pts].push(team);
    });

    const sortedPoints = Object.keys(groupsMap)
      .map(Number)
      .sort((a, b) => b - a);

    const sortedStats: any[] = [];

    for (const pts of sortedPoints) {
      const tiedTeams = groupsMap[pts];
      if (tiedTeams.length === 2) {
        // Desempate Directo
        const a = tiedTeams[0];
        const b = tiedTeams[1];
        const partidoDirecto = groupMatches.find(
          (m) =>
            m.ronda === g.nombre_grupo &&
            m.ganador &&
            ((m.equipo_a_id === a.id && m.equipo_b_id === b.id) ||
              (m.equipo_a_id === b.id && m.equipo_b_id === a.id))
        );
        if (partidoDirecto && partidoDirecto.ganador) {
          if (partidoDirecto.ganador === a.id) {
            sortedStats.push(a, b);
          } else {
            sortedStats.push(b, a);
          }
        } else {
          sortedStats.push(a, b);
        }
      } else if (tiedTeams.length >= 3) {
        // Triple Empate
        tiedTeams.sort((a, b) => {
          if (a.diffSets !== b.diffSets) return b.diffSets - a.diffSets;
          if (a.diffGames !== b.diffGames) return b.diffGames - a.diffGames;
          if (a.gamesAFavor !== b.gamesAFavor) return b.gamesAFavor - a.gamesAFavor;
          if (a.gamesEnContra !== b.gamesEnContra) return a.gamesEnContra - b.gamesEnContra;
          return 0;
        });
        sortedStats.push(...tiedTeams);
      } else {
        sortedStats.push(...tiedTeams);
      }
    }
    standingsByGroup[g.nombre_grupo] = sortedStats;
  }
  
  // 3. Obtener nombres de zonas ordenadas (Zona A, Zona B...)
  const groupNames = Object.keys(standingsByGroup).sort();
  const n = groupNames.length;
  
  if (n < 2) return;
  
  // Determinar la ronda correspondiente al primer cruce de playoffs
  const roundName = n === 2 ? "SEMIS" : n === 4 ? "CUARTOS" : n === 8 ? "OCTAVOS" : "16AVOS";
  
  const { data: playoffMatches } = await supabaseAdmin
    .from("partidos")
    .select("id")
    .eq("torneo_id", torneoId)
    .eq("ronda", roundName)
    .order("orden", { ascending: true });
     
  if (playoffMatches && playoffMatches.length >= n) {
    for (let k = 0; k < n; k++) {
      // Pareja 1: El 1º del grupo k
      const firstOfK = standingsByGroup[groupNames[k]]?.[0]?.id;
      
      // Pareja 2: El 2º del grupo (k ^ 1) [XOR 1 cruza 0 con 1, 2 con 3, etc.]
      const opponentIndex = k ^ 1;
      const secondOfOpponent = standingsByGroup[groupNames[opponentIndex]]?.[1]?.id;
       
      if (firstOfK && secondOfOpponent) {
        await supabaseAdmin
          .from("partidos")
          .update({ 
            equipo_a_id: firstOfK, 
            equipo_b_id: secondOfOpponent,
            estado_partido: "Programado"
          })
          .eq("id", playoffMatches[k].id);
      }
    }
  }
}
