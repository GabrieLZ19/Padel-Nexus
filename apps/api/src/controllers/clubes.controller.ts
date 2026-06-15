import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllClubes = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("clubes")
      .select(
        `
        id, nombre, provincia, localidad, estado,
        canchas(id, nombre, tipo_suelo, techada, activa)
      `,
      )
      .eq("estado", "activo");

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener clubes", error });
  }
};

export const createClub = async (req: Request, res: Response) => {
  try {
    const { nombre, provincia, localidad } = req.body;

    // Validamos datos mínimos
    if (!nombre)
      return res.status(400).json({ message: "El nombre es obligatorio" });

    const { data, error } = await supabase
      .from("clubes")
      .insert([{ nombre, provincia, localidad, estado: "activo" }])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al crear club", error });
  }
};

export const updateClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, provincia, localidad, estado } = req.body;

    const { data, error } = await supabase
      .from("clubes")
      .update({ nombre, provincia, localidad, estado })
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: unknown) {
    res.status(500).json({ message: "Error al actualizar el club", error });
  }
};

export const deleteClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Profesional: en lugar de borrar físicamente (hard delete),
    // preferimos marcar como inactivo (soft delete) para mantener integridad histórica.
    const { error } = await supabase
      .from("clubes")
      .update({ estado: "inactivo" })
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Club desactivado correctamente" });
  } catch (error: unknown) {
    res.status(500).json({ message: "Error al desactivar el club", error });
  }
};

// Nueva función para gestionar canchas específicamente
export const updateCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const canchaData = req.body;

    const { data, error } = await supabase
      .from("canchas")
      .update(canchaData)
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar cancha", error });
  }
};
