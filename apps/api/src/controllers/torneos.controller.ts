import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllTorneos = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("torneos")
      .select(`*, clubes(nombre, provincia), inscripciones(usuario_id)`)
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
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

// export const updateTorneoEstado = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { estado } = req.body;

//     if (!estado)
//       return res.status(400).json({ message: "El estado es requerido" });

//     const { data, error } = await supabase
//       .from("torneos")
//       .update({ estado })
//       .eq("id", id)
//       .select();

//     if (error) throw error;
//     res.status(200).json(data[0]);
//   } catch (error: any) {
//     res
//       .status(500)
//       .json({ message: "Error al actualizar estado", error: error.message });
//   }
// };

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
// GENERADOR DE CUADROS AUTOMATIZADO
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

    await supabase.from("partidos").delete().eq("torneo_id", id);

    const shuffled = inscripciones.sort(() => 0.5 - Math.random());
    const partidos = [];
    let orden = 1;

    // Creación de Formato Eliminatoria Directa (Ej: 8 jugadores)
    if (torneo.formato === "Eliminatoria Directa") {
      const isOctavos = shuffled.length > 8;

      if (isOctavos) {
        for (let i = 0; i < 16; i += 2)
          partidos.push({
            torneo_id: id,
            equipo_a_id: shuffled[i]?.id || null,
            equipo_b_id: shuffled[i + 1]?.id || null,
            ronda: "OCTAVOS",
            orden: orden++,
            estado_partido: "Programado",
          });
        for (let i = 0; i < 4; i++)
          partidos.push({
            torneo_id: id,
            equipo_a_id: null,
            equipo_b_id: null,
            ronda: "CUARTOS",
            orden: orden++,
            estado_partido: "Programado",
          });
      } else {
        // Cuartos de final
        for (let i = 0; i < 8; i += 2)
          partidos.push({
            torneo_id: id,
            equipo_a_id: shuffled[i]?.id || null,
            equipo_b_id: shuffled[i + 1]?.id || null,
            ronda: "CUARTOS",
            orden: orden++,
            estado_partido: "Programado",
          });
      }

      // Semifinales
      partidos.push({
        torneo_id: id,
        equipo_a_id: null,
        equipo_b_id: null,
        ronda: "SEMIS",
        orden: orden++,
        estado_partido: "Programado",
      });
      partidos.push({
        torneo_id: id,
        equipo_a_id: null,
        equipo_b_id: null,
        ronda: "SEMIS",
        orden: orden++,
        estado_partido: "Programado",
      });

      // Final
      partidos.push({
        torneo_id: id,
        equipo_a_id: null,
        equipo_b_id: null,
        ronda: "FINAL",
        orden: orden++,
        estado_partido: "Programado",
      });
    }

    const { error: insertError } = await supabase
      .from("partidos")
      .insert(partidos);
    if (insertError) throw insertError;

    // --- ACCIÓN AUTOMÁTICA: Cambiar estado a "En curso" ---
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
// AVANCE MATEMÁTICO UNIVERSAL
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
      .select("id, torneo_id, ronda, orden")
      .single();

    if (updateError) throw updateError;

    // 2. Si es la FINAL, actualizamos el estado del torneo a "Finalizado"
    if (partido.ronda === "FINAL") {
      await supabase
        .from("torneos")
        .update({ estado: "Finalizado" })
        .eq("id", partido.torneo_id);
    }
    // 3. Si no es la FINAL, seguimos con la lógica de avance automático
    else {
      const rondasSiguientes: Record<string, string> = {
        OCTAVOS: "CUARTOS",
        CUARTOS: "SEMIS",
        SEMIS: "FINAL",
      };

      const rondaSiguiente = rondasSiguientes[partido.ronda];
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

    res.status(200).json({ message: "Resultado cargado exitosamente" });
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al actualizar partido", error: error.message });
  }
};
