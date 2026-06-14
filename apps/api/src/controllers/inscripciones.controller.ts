import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllInscripciones = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("inscripciones_torneos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: any) {
    res
      .status(500)
      .json({
        message: "Error al obtener inscripciones",
        error: error.message,
      });
  }
};

export const updateEstadoPago = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado_pago } = req.body;

    const { data, error } = await supabase
      .from("inscripciones_torneos")
      .update({ estado_pago })
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: any) {
    res
      .status(500)
      .json({ message: "Error al actualizar estado", error: error.message });
  }
};
