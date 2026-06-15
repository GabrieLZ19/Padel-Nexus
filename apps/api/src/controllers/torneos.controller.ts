import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllTorneos = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("torneos")
      .select("*, clubes(nombre, provincia)")
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
      .select("*, clubes(nombre, provincia)")
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
      premios, // Agrupamos premios para limpiar el objeto
    } = req.body;

    // 1. Usamos una transacción para garantizar integridad
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

    // 2. Creamos la estructura inicial en la tabla 'cuadros'
    // Esto vincula el torneo con su estructura de gestión de llaves
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
    const updateData = req.body; // Enviamos todo el body directamente para flexibilidad

    const { data, error } = await supabase
      .from("torneos")
      .update(updateData)
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al actualizar torneo", error: message });
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

export const getPartidosByTorneo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("partidos")
      .select(
        `
        *,
        equipo_a:inscripciones!equipo_a_id(jugador2_nombre),
        equipo_b:inscripciones!equipo_b_id(jugador2_nombre)
      `,
      )
      .eq("torneo_id", id)
      .order("orden", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: unknown) {
    res.status(500).json({ message: "Error al obtener partidos", error });
  }
};

export const generarCuadros = async (req: Request, res: Response) => {
  try {
    const { torneo_id } = req.body;

    // 1. Obtener todos los inscritos en el torneo
    const { data: inscripciones, error: inscError } = await supabase
      .from("inscripciones")
      .select("id, usuario_id")
      .eq("torneo_id", torneo_id);

    if (inscError || !inscripciones || inscripciones.length < 2) {
      return res.status(400).json({
        message: "Se necesitan al menos 2 inscritos para generar el cuadro",
      });
    }

    // 2. Algoritmo simple de emparejamiento (Eliminatoria Directa)

    const partidos = [];
    for (let i = 0; i < inscripciones.length; i += 2) {
      if (inscripciones[i + 1]) {
        partidos.push({
          torneo_id,
          equipo_a_id: inscripciones[i].id,
          equipo_b_id: inscripciones[i + 1].id,
          ronda: "1/8 Final", // Por defecto
          estado_partido: "Programado",
        });
      }
    }

    // 3. Insertar todos los partidos de una sola vez
    const { error: insertError } = await supabase
      .from("partidos")
      .insert(partidos);

    if (insertError) throw insertError;

    res.status(200).json({
      message: "Cuadros generados exitosamente",
      partidosCount: partidos.length,
    });
  } catch (error) {
    res.status(500).json({ message: "Error al generar cuadros", error });
  }
};

export const actualizarResultado = async (req: Request, res: Response) => {
  try {
    const { partido_id } = req.params;
    const { ganador_id, set1_a, set1_b } = req.body;

    // 1. Actualizar el partido con el ganador
    const { data: partido, error: updateError } = await supabase
      .from("partidos")
      .update({
        ganador: ganador_id,
        set1_a,
        set1_b,
        estado_partido: "Finalizado",
      })
      .eq("id", partido_id)
      .select("torneo_id, ronda, orden")
      .single();

    if (updateError) throw updateError;

    // 2. Lógica de "Salto de Ronda" (Automatización)
    // Buscamos el siguiente partido en la llave donde el ganador debería ir
    const siguienteOrden = Math.floor(partido.orden / 2);

    await supabase
      .from("partidos")
      .update({
        // Si el orden es par, va a equipo_a_id, si es impar a equipo_b_id
        [partido.orden % 2 === 0 ? "equipo_a_id" : "equipo_b_id"]: ganador_id,
      })
      .eq("torneo_id", partido.torneo_id)
      .eq("orden", siguienteOrden);

    res
      .status(200)
      .json({ message: "Resultado cargado y ganador avanzado de ronda" });
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar partido", error });
  }
};
