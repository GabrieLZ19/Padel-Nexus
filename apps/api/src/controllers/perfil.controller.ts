import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// 1. Para el dashboard del usuario normal (lee el ID del token)
export const getMiPerfil = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id; // Viene del middleware authenticate
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const { data, error } = await supabase
      .from("perfiles")
      .select(
        `
        *,
        licencias (nro_licencia, estado, fecha_vencimiento)
      `,
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Perfil no encontrado" });

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error al obtener tu perfil",
      error: error.message,
    });
  }
};

// 2. Para el Admin que busca perfiles de terceros (lee el ID de la URL)
export const getPerfilById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("perfiles")
      .select(
        `
        *,
        licencias (nro_licencia, estado, fecha_vencimiento)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Perfil no encontrado" });

    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({
      message: "Error al obtener el perfil",
      error: error.message,
    });
  }
};

// 3. El update queda igual porque es para el usuario ("me")
export const updatePerfil = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { nombre_completo, telefono, categoria_padel, lado_preferido } =
    req.body;

  const { data, error } = await supabase
    .from("perfiles")
    .update({ nombre_completo, telefono, categoria_padel, lado_preferido })
    .eq("id", userId)
    .select()
    .single();

  if (error) return res.status(400).json({ message: "Error al actualizar" });

  res.json(data);
};
