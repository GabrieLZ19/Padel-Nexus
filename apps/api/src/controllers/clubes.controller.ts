import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllClubes = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("clubes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener clubes", error: message });
  }
};

export const createClub = async (req: Request, res: Response) => {
  try {
    // Si quisieras registrar quién creó el club, podrías añadir un campo 'created_by'
    // const adminId = req.user!.id;
    const { nombre, provincia, localidad, canchas, estado } = req.body;

    const { data, error } = await supabase
      .from("clubes")
      .insert([{ nombre, provincia, localidad, canchas, estado }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res.status(500).json({ message: "Error al crear el club", error: message });
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
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al actualizar el club", error: message });
  }
};

export const deleteClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from("clubes").delete().eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Club eliminado correctamente" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al eliminar el club", error: message });
  }
};
