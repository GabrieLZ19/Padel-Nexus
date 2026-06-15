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
    const { torneo_id, usuario_id, jugador2_nombre, monto } = req.body;

    const { data: existingInscripcion } = await supabase
      .from("inscripciones")
      .select("id")
      .eq("torneo_id", torneo_id)
      .eq("usuario_id", usuario_id)
      .single();

    if (existingInscripcion) {
      return res
        .status(409)
        .json({ message: "Ya te encuentras inscrito en este torneo." });
    }

    // 1. Verificación: Obtener torneo y manejar posibles errores
    const { data: torneo, error: torneoError } = await supabase
      .from("torneos")
      .select("cupos_maximos, cupos_actuales")
      .eq("id", torneo_id)
      .single();

    // Si hay error o no existe el torneo, lanzamos error
    if (torneoError || !torneo) {
      return res.status(404).json({ message: "Torneo no encontrado" });
    }

    // 2. Validación de cupos (ahora TypeScript sabe que torneo NO es null)
    if (torneo.cupos_actuales >= torneo.cupos_maximos) {
      return res
        .status(400)
        .json({ message: "El torneo ya no tiene cupos disponibles" });
    }

    // 3. Insertar inscripción
    const { data, error } = await supabase
      .from("inscripciones")
      .insert([
        {
          torneo_id,
          usuario_id,
          jugador2_nombre,
          monto,
          estado_pago: "Pendiente",
        },
      ])
      .select();

    if (error) throw error;

    // 4. Incrementar cupos
    const { error: updateError } = await supabase
      .from("torneos")
      .update({ cupos_actuales: torneo.cupos_actuales + 1 })
      .eq("id", torneo_id);

    if (updateError) throw updateError;

    res.status(201).json(data[0]);
  } catch (error) {
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
