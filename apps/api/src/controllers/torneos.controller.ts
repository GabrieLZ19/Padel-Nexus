import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllTorneos = async (req: Request, res: Response) => {
  try {
    const { page, limit, search, estado } = req.query;
    const hasPage = typeof page !== "undefined";
    const hasLimit = typeof limit !== "undefined";

    let query = supabase
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`, {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("nombre", `%${search}%`);
    }

    if (estado) {
      const estados = String(estado)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (estados.length === 1) {
        query = query.eq("estado", estados[0]);
      } else if (estados.length > 1) {
        query = query.in("estado", estados);
      }
    }

    if (hasPage) {
      const pageNum = Number(page);
      const limitNum = Number(limit || "10");
      const from = (pageNum - 1) * limitNum;
      const to = from + limitNum - 1;

      const { data, error, count } = (await query.range(from, to)) as any;

      if (error) throw error;

      const formattedData = (data || []).map((torneo: any) => ({
        ...torneo,
        cupos_actuales: torneo.cupos_actuales || 0,
        cupos_maximos: torneo.cupos_maximos || 0,
      }));

      return res.status(200).json({ data: formattedData, total: count || 0 });
    }

    if (hasLimit) {
      const limitNum = Number(limit || "10");
      const { data, error } = await query
        .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`)
        .order("created_at", { ascending: false })
        .range(0, limitNum - 1);
      if (error) throw error;
      const formattedData = (data || []).map((torneo: any) => ({
        ...torneo,
        cupos_actuales: torneo.cupos_actuales || 0,
        cupos_maximos: torneo.cupos_maximos || 0,
      }));
      return res.status(200).json(formattedData);
    }

    const { data, error } = await query
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const formattedData = (data || []).map((torneo: any) => ({
      ...torneo,
      cupos_actuales: torneo.cupos_actuales || 0,
      cupos_maximos: torneo.cupos_maximos || 0,
    }));

    res.status(200).json(formattedData);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener torneos", error: message });
  }
};

export const getTorneoById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Torneo no encontrado" });

    res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener detalle del torneo", error: message });
  }
};

export const createTorneo = async (req: Request, res: Response) => {
  try {
    const {
      nombre,
      subtitulo,
      club_id,
      fecha,
      estado,
      cupos_maximos,
      nivel,
      categoria,
      modalidad,
      precio_inscripcion,
      formato,
      premios,
    } = req.body;

    const { data: torneo, error: torneoError } = await supabase
      .from("torneos")
      .insert([
        {
          nombre,
          subtitulo,
          club_id,
          fecha,
          estado,
          cupos_maximos,
          cupos_actuales: 0,
          nivel,
          categoria,
          modalidad,
          precio_inscripcion,
          formato,
          premio_1: premios?.uno,
          premio_2: premios?.dos,
          premio_3: premios?.tres,
        },
      ])
      .select()
      .single();

    if (torneoError) throw torneoError;

    const { error: cuadroError } = await supabase.from("cuadros").insert([
      {
        torneo_id: torneo.id,
        fase: "Fase Inicial",
        configuracion: { formato: formato, estado: "esperando_inscripciones" },
      },
    ]);

    if (cuadroError) throw cuadroError;

    res.status(201).json(torneo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res.status(500).json({ message: "Error al crear torneo", error: message });
  }
};

export const updateTorneo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      subtitulo,
      club_id,
      fecha,
      cupos_maximos,
      nivel,
      categoria,
      modalidad,
      precio_inscripcion,
      formato,
      premios,
      estado,
    } = req.body;

    const updateData: any = {
      nombre,
      subtitulo,
      club_id,
      fecha,
      cupos_maximos,
      nivel,
      categoria,
      modalidad,
      precio_inscripcion,
      formato,
      estado,
    };

    if (premios) {
      updateData.premio_1 = premios.uno;
      updateData.premio_2 = premios.dos;
      updateData.premio_3 = premios.tres;
    }

    const { data, error } = await supabase
      .from("torneos")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al actualizar torneo", error: error.message });
  }
};

export const deleteTorneo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("torneos").delete().eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Torneo eliminado correctamente" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al eliminar torneo", error: message });
  }
};

// =======================================================================
// OBTENER INSCRITOS Y PARTIDOS
// =======================================================================
export const getInscripcionesByTorneo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("inscripciones")
      .select("*")
      .eq("torneo_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener inscripciones", error: message });
  }
};

export const getPartidosByTorneo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: partidos, error: partidosError } = await supabase
      .from("partidos")
      .select("*")
      .eq("torneo_id", id)
      .order("orden", { ascending: true });

    if (partidosError) throw partidosError;

    const { data: inscripciones, error: insError } = await supabase
      .from("inscripciones")
      .select("id, jugador1_nombre, jugador2_nombre")
      .eq("torneo_id", id);

    if (insError) throw insError;

    const insMap = new Map();
    (inscripciones || []).forEach((ins) => insMap.set(ins.id, ins));

    const formattedPartidos = (partidos || []).map((p) => {
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

    res.status(200).json(formattedPartidos);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener partidos", error: message });
  }
};

// =======================================================================
// GENERADOR DE CUADROS AUTOMATIZADO (DINÁMICO PARA 4, 8, 16, 32 CUPOS)
// =======================================================================
export const generarCuadros = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: torneo, error: torneoError } = await supabase
      .from("torneos")
      .select("formato, cupos_maximos")
      .eq("id", id)
      .single();

    if (torneoError || !torneo) throw new Error("Torneo no encontrado");

    const { data: inscripciones, error: inscError } = await supabase
      .from("inscripciones")
      .select("id, usuario_id")
      .eq("torneo_id", id)
      .eq("estado_pago", "Confirmado");

    if (inscError || !inscripciones || inscripciones.length < 4) {
      return res
        .status(400)
        .json({ message: "Se necesitan al menos 4 inscritos confirmados." });
    }

    // Borrar llaves anteriores si existían
    await supabase.from("partidos").delete().eq("torneo_id", id);

    const shuffled = inscripciones.sort(() => 0.5 - Math.random());
    const partidos = [];
    let orden = 1;

    if (torneo.formato === "Eliminatoria Directa") {
      const cupos = torneo.cupos_maximos || 16;

      // Mapeo maestro de rondas
      const roundsConfig = [
        { name: "32AVOS", matches: 32 },
        { name: "16AVOS", matches: 16 },
        { name: "OCTAVOS", matches: 8 },
        { name: "CUARTOS", matches: 4 },
        { name: "SEMIS", matches: 2 },
        { name: "FINAL", matches: 1 },
      ];

      // Encontramos desde qué ronda debe empezar el torneo (Ej: Cupo 4 -> StartIndex apunta a SEMIS (2 partidos))
      const startIndex = roundsConfig.findIndex((r) => r.matches === cupos / 2);
      if (startIndex === -1)
        throw new Error("Cantidad de cupos inválida para generar cuadro.");

      for (let i = startIndex; i < roundsConfig.length; i++) {
        const round = roundsConfig[i];

        for (let j = 0; j < round.matches; j++) {
          let equipo_a_id = null;
          let equipo_b_id = null;

          // Solo poblamos con jugadores la ronda inicial, el resto espera rival
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

    const { error: insertError } = await supabase
      .from("partidos")
      .insert(partidos);
    if (insertError) throw insertError;

    await supabase.from("torneos").update({ estado: "En curso" }).eq("id", id);

    res.status(200).json({
      message: "Cuadro generado exitosamente",
      partidosCount: partidos.length,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al generar cuadros", error: error.message });
  }
};

// =======================================================================
// AVANCE MATEMÁTICO UNIVERSAL + REPARTO DE PUNTOS PROFESIONAL
// =======================================================================
export const actualizarResultado = async (req: Request, res: Response) => {
  try {
    const { partido_id } = req.params;
    const { ganador_id, set1_a, set1_b } = req.body;

    // 1. Guardar resultado y obtener datos del partido
    const { data: partido, error: updateError } = await supabase
      .from("partidos")
      .update({
        ganador: ganador_id,
        set1_a,
        set1_b,
        estado_partido: "Finalizado",
      })
      .eq("id", partido_id)
      .select("id, torneo_id, ronda, orden, equipo_a_id, equipo_b_id")
      .single();

    if (updateError) throw updateError;

    // 2. Identificar al Perdedor de este partido específico
    const perdedor_id =
      ganador_id === partido.equipo_a_id
        ? partido.equipo_b_id
        : partido.equipo_a_id;

    // 3. Obtener info del Torneo para el Ranking
    const { data: torneoInfo } = await supabase
      .from("torneos")
      .select("nivel, categoria, modalidad")
      .eq("id", partido.torneo_id)
      .single();

    if (torneoInfo) {
      // --- TABLA DE PUNTUACIÓN ESTÁNDAR (Estilo Premier Padel) ---
      const TABLA_PUNTOS: Record<
        string,
        { ganador?: number; perdedor: number }
      > = {
        "16AVOS": { perdedor: 45 },
        OCTAVOS: { perdedor: 90 },
        CUARTOS: { perdedor: 180 },
        SEMIS: { perdedor: 360 },
        FINAL: { ganador: 1000, perdedor: 600 }, // La final da puntos a ambos
      };

      const rondaNormalizada = partido.ronda.toUpperCase().trim();
      const puntosRonda = TABLA_PUNTOS[rondaNormalizada];

      // Helper: Procesar inscripción, sumar puntos y registrar ESTADÍSTICAS (PJ/PG)
      const darPuntosAInscripcion = async (
        inscripcionId: string,
        puntosASumar: number,
        isGanador: boolean,
      ) => {
        if (!inscripcionId) return;

        const { data: inscripcion } = await supabase
          .from("inscripciones")
          .select("usuario_id")
          .eq("id", inscripcionId)
          .single();

        if (inscripcion && inscripcion.usuario_id) {
          const { data: rank } = await supabase
            .from("rankings")
            .select("puntos, pj, pg")
            .eq("usuario_id", inscripcion.usuario_id)
            .eq("categoria", torneoInfo.nivel)
            .single();

          const pAnt = rank?.puntos || 0;
          const pjAnt = rank?.pj || 0;
          const pgAnt = rank?.pg || 0;

          // ACTUALIZACIÓN MAESTRA DE ESTADÍSTICAS EN TIEMPO REAL
          await supabase.from("rankings").upsert(
            {
              usuario_id: inscripcion.usuario_id,
              categoria: torneoInfo.nivel,
              rama: torneoInfo.categoria,
              puntos: pAnt + puntosASumar,
              pj: pjAnt + 1, // Suma 1 Partido Jugado siempre
              pg: isGanador ? pgAnt + 1 : pgAnt, // Suma 1 Ganado solo si ganó
              updated_at: new Date().toISOString(),
            },
            { onConflict: "usuario_id,categoria" },
          );

          // Guardar historial de ranking (solo si sumó puntos por llegar lejos)
          if (puntosASumar > 0) {
            await supabase.from("historial_ranking").insert([
              {
                usuario_id: inscripcion.usuario_id,
                torneo_id: partido.torneo_id,
                puntos_anteriores: pAnt,
                puntos_nuevos: pAnt + puntosASumar,
              },
            ]);
          }
        }
      };

      // 3.1 Asignar puntos y stats al PERDEDOR
      if (perdedor_id) {
        // El perdedor recibe los puntos correspondientes a la ronda en la que se quedó y suma 1 PJ, 0 PG
        await darPuntosAInscripcion(
          perdedor_id,
          puntosRonda?.perdedor || 0,
          false,
        );
      }

      // 3.2 Asignar puntos y stats al GANADOR
      if (ganador_id) {
        // El ganador recibe puntos SOLO en la final. Pero en cada ronda, SIEMPRE suma 1 PJ y 1 PG
        const puntosGanador =
          rondaNormalizada === "FINAL" && puntosRonda?.ganador
            ? puntosRonda.ganador
            : 0;
        await darPuntosAInscripcion(ganador_id, puntosGanador, true);
      }
    }

    // 4. Lógica de Avance en el Cuadro o Finalización del Torneo
    if (partido.ronda.toUpperCase() === "FINAL") {
      await supabase
        .from("torneos")
        .update({ estado: "Finalizado" })
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
        const { data: partidosRondaActual } = await supabase
          .from("partidos")
          .select("id, orden")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", partido.ronda)
          .order("orden", { ascending: true });

        const { data: partidosRondaSiguiente } = await supabase
          .from("partidos")
          .select("id, orden")
          .eq("torneo_id", partido.torneo_id)
          .eq("ronda", rondaSiguiente)
          .order("orden", { ascending: true });

        if (partidosRondaActual && partidosRondaSiguiente) {
          const miIndice = partidosRondaActual.findIndex(
            (p) => p.id === partido.id,
          );
          const indiceHijo = Math.floor(miIndice / 2);
          const partidoDestino = partidosRondaSiguiente[indiceHijo];

          if (partidoDestino) {
            const ranuraDestino =
              miIndice % 2 === 0 ? "equipo_a_id" : "equipo_b_id";
            await supabase
              .from("partidos")
              .update({ [ranuraDestino]: ganador_id })
              .eq("id", partidoDestino.id);
          }
        }
      }
    }

    res.status(200).json({
      message:
        "Resultado cargado y estadísticas/puntos distribuidos exitosamente",
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al actualizar partido", error: error.message });
  }
};
