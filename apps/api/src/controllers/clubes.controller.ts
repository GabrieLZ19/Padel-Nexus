import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllClubes = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("clubes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ ERROR GET SUPABASE:", error);
      throw error;
    }

    res.status(200).json(data);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al obtener clubes", error: error.message });
  }
};

export const createClub = async (req: Request, res: Response) => {
  try {
    const { nombre, provincia, localidad, canchas, estado } = req.body;

    const { data, error } = await supabase
      .from("clubes")
      .insert([
        {
          nombre,
          provincia,
          localidad,
          canchas,
          estado,
        },
      ])
      .select();

    // ESTA LÍNEA ES LA CLAVE PARA DEBUGGEAR
    if (error) {
      console.error("❌ ERROR POST SUPABASE:", error);
      throw error;
    }

    res.status(201).json(data[0]);
  } catch (error: any) {
    console.error("❌ ERROR DEL SERVIDOR:", error.message);
    res
      .status(500)
      .json({ message: "Error al crear el club", error: error.message });
  }
};

export const updateClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, provincia, localidad, canchas, estado } = req.body;

    const { data, error } = await supabase
      .from("clubes")
      .update({ nombre, provincia, localidad, canchas, estado })
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: any) {
    console.error("❌ ERROR PUT SUPABASE:", error.message);
    res
      .status(500)
      .json({ message: "Error al actualizar el club", error: error.message });
  }
};

export const deleteClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("clubes").delete().eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Club eliminado correctamente" });
  } catch (error: any) {
    console.error("❌ ERROR DELETE SUPABASE:", error.message);
    res
      .status(500)
      .json({ message: "Error al eliminar el club", error: error.message });
  }
};
