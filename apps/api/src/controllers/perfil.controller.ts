import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getPerfil = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { data, error } = await supabase
    .from("perfiles")
    .select("*, licencias(*)")
    .eq("id", userId)
    .single();

  if (error) return res.status(404).json({ message: "Perfil no encontrado" });
  res.json(data);
};

export const updatePerfil = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { nombre_completo, telefono, categoria_padel, lado_preferido } =
    req.body;

  const { data, error } = await supabase
    .from("perfiles")
    .update({ nombre_completo, telefono, categoria_padel, lado_preferido })
    .eq("id", userId);

  if (error) return res.status(400).json({ message: "Error al actualizar" });
  res.json({ message: "Perfil actualizado" });
};
