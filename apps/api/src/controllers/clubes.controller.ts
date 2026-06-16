import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// 1. LISTAR, PAGINAR Y FILTRAR
export const getAllClubes = async (req: Request, res: Response) => {
  try {
    // 2. Validar inputs (Query params)
    const { page = 1, limit = 10, search, provincia } = req.query;
    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    let query = supabase
      .from("clubes")
      .select(`*, torneos (count)`, { count: "exact" })
      .range(from, to);

    // Filtros dinámicos
    if (search) query = query.ilike("nombre", `%${search}%`);
    if (provincia) query = query.eq("provincia", provincia);

    const { data, error, count } = await query;

    if (error) throw error;

    const formattedData = data.map((club: any) => ({
      ...club,
      torneos_count:
        club.torneos && club.torneos.length > 0 ? club.torneos[0].count : 0,
    }));

    res.status(200).json({ data: formattedData, total: count });
  } catch (error) {
    res.status(500).json({ message: "Error al obtener clubes", error });
  }
};

// 2. DETALLE (Nuevo endpoint)
export const getClubById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("clubes")
      .select(`*, torneos (*)`)
      .eq("id", id)
      .single();

    if (error) return res.status(404).json({ message: "Club no encontrado" });

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener el club", error });
  }
};

// 3. CREAR
export const createClub = async (req: Request, res: Response) => {
  try {
    // 2. Validar inputs
    const { nombre, provincia, localidad, canchas, estado } = req.body;

    if (!nombre || !provincia) {
      return res
        .status(400)
        .json({ message: "Nombre y provincia son obligatorios" });
    }

    const { data, error } = await supabase
      .from("clubes")
      .insert([
        {
          nombre,
          provincia,
          localidad,
          canchas: Number(canchas) || 0,
          estado: estado || "Activo",
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ message: "Error al crear club", error });
  }
};

// 4. EDITAR
export const updateClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, provincia, localidad, estado, canchas } = req.body;

    // Validación básica de existencia
    if (!id) return res.status(400).json({ message: "ID requerido" });

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
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al actualizar", error: error.message });
  }
};

// 5. ELIMINAR (Soft Delete)
export const deleteClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("clubes")
      .update({ estado: "Inactivo" })
      .eq("id", id);

    if (error) throw error;
    res.status(200).json({ message: "Club desactivado" });
  } catch (error) {
    res.status(500).json({ message: "Error al desactivar", error });
  }
};
