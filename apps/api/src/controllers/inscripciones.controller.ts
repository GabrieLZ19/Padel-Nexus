import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllInscripciones = async (req: Request, res: Response) => {
  try {
    // Nota: Si necesitas los datos del torneo, podrías usar un .select("*, torneos(*)")
    const { data, error } = await supabase
      .from("inscripciones")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al obtener inscripciones", error: message });
  }
};

export const createInscripcion = async (req: Request, res: Response) => {
  try {
    // Ahora el usuario está garantizado por el middleware 'authenticate'
    const usuario_id = req.user!.id;
    const { torneo_id, jugador2_nombre, monto } = req.body;

    const { data, error } = await supabase
      .from("inscripciones")
      .insert([
        {
          torneo_id,
          usuario_id,
          jugador2_nombre: jugador2_nombre || "-",
          monto,
          estado_pago: "Pendiente",
        },
      ])
      .select();

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res.status(500).json({ message: "Error al inscribirse", error: message });
  }
};

export const updateEstadoPago = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { estado_pago } = req.body;

    // Actualizamos en la tabla nueva 'inscripciones'
    const { data, error } = await supabase
      .from("inscripciones")
      .update({ estado_pago })
      .eq("id", id)
      .select();

    if (error) throw error;
    res.status(200).json(data[0]);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al actualizar estado", error: message });
  }
};
