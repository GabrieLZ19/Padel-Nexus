import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllTorneos = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("torneos")
      .select("*, clubes(nombre)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ ERROR GET TORNEOS:", error.message);
      throw error;
    }

    res.status(200).json(data);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al obtener torneos", error: error.message });
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
    } = req.body;

    const { data, error } = await supabase
      .from("torneos")
      .insert([
        {
          nombre,
          subtitulo,
          club_id: club_id || null, // Previene error de sintaxis si viene vacío
          fecha: fecha || null, // Permite fechas nulas como tenés en tu BD
          estado,
          cupos_maximos,
          nivel,
          categoria,
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error("❌ ERROR POST TORNEOS:", error.message);
    res
      .status(500)
      .json({ message: "Error al crear torneo", error: error.message });
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
      estado,
      cupos_maximos,
      nivel,
      categoria,
    } = req.body;

    const { data, error } = await supabase
      .from("torneos")
      .update({
        nombre,
        subtitulo,
        club_id: club_id || null,
        fecha: fecha || null,
        estado,
        cupos_maximos,
        nivel,
        categoria,
      })
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: any) {
    console.error("❌ ERROR PUT TORNEOS:", error.message);
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
  } catch (error: any) {
    console.error("❌ ERROR DELETE TORNEOS:", error.message);
    res
      .status(500)
      .json({ message: "Error al eliminar torneo", error: error.message });
  }
};
