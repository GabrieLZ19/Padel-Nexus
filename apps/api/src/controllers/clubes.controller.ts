import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllClubes = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase.from("clubes").select(`
        *,
        torneos (count)
      `);

    if (error) throw error;

    // 3. Mapeamos la respuesta para que el frontend reciba "torneos_count" como lo espera
    const formattedData = data.map((club: any) => ({
      ...club,
      torneos_count:
        club.torneos && club.torneos.length > 0 ? club.torneos[0].count : 0,
    }));

    res.status(200).json(formattedData);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener clubes", error });
  }
};

export const createClub = async (req: Request, res: Response) => {
  try {
    // AHORA SÍ: Extraemos 'canchas' y 'estado' del body
    const { nombre, provincia, localidad, canchas, estado } = req.body;

    if (!nombre)
      return res.status(400).json({ message: "El nombre es obligatorio" });

    const { data, error } = await supabase
      .from("clubes")
      .insert([
        {
          nombre,
          provincia,
          localidad,
          canchas: Number(canchas) || 0, // Aseguramos que sea número
          estado: estado || "Activo", // Respetamos el estado que manda el Modal
        },
      ])
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
    // AHORA SÍ: Extraemos 'canchas' del body
    const { nombre, provincia, localidad, estado, canchas } = req.body;

    const { data, error } = await supabase
      .from("clubes")
      .update({
        nombre,
        provincia,
        localidad,
        estado,
        canchas: Number(canchas) || 0,
      })
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

    // Soft delete: Excelente práctica para no romper FKs (reservas, torneos, etc)
    const { error } = await supabase
      .from("clubes")
      .update({ estado: "Inactivo" }) // Capitalizado para que coincida con tu Modal
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Club desactivado correctamente" });
  } catch (error: unknown) {
    res.status(500).json({ message: "Error al desactivar el club", error });
  }
};

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
