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
    // Destructuring con valores por defecto para mayor seguridad
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
      premio_1,
      premio_2,
      premio_3,
    } = req.body;

    const { data, error } = await supabase
      .from("torneos")
      .insert([
        {
          nombre,
          subtitulo,
          club_id: club_id || null,
          fecha: fecha || null,
          estado,
          cupos_maximos,
          cupos_actuales: 0, // Iniciamos en cero
          nivel,
          categoria,
          modalidad: modalidad || "Duplas",
          precio_inscripcion: precio_inscripcion || 0,
          formato: formato || "Eliminatoria Directa",
          premio_1,
          premio_2,
          premio_3,
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
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
      .select("*")
      .eq("torneo_id", id)
      .order("orden", { ascending: true });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener partidos", error: message });
  }
};
