import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllInscripciones = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("inscripciones")
      .select(
        `
        *,
        perfiles (nombre_completo),
        torneos (nombre, categoria)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const formattedData = data.map((ins: any) => ({
      ...ins,

      jugador1_nombre: ins.perfiles?.nombre_completo || "Usuario Desconocido",

      torneo_nombre: ins.torneos?.nombre || "Torneo no asignado",
      categoria: ins.torneos?.categoria || "-",

      tipo: ins.tipo || "Inscripción torneo",
    }));

    res.status(200).json(formattedData);
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

    // 1. VALIDACIÓN: ¿Tiene licencia activa? (Requisito fundamental)
    const { data: licencia, error: licError } = await supabase
      .from("licencias")
      .select("estado")
      .eq("usuario_id", usuario_id)
      .single();

    if (licError || !licencia || licencia.estado !== "Activa") {
      return res.status(403).json({
        message: "Para inscribirte, debes tener una licencia vigente y activa.",
      });
    }

    // 2. VALIDACIÓN: ¿Ya está inscrito? (Evitar duplicados)
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

    // 3. VALIDACIÓN: Cupos disponibles
    const { data: torneo, error: torneoError } = await supabase
      .from("torneos")
      .select("cupos_maximos, cupos_actuales")
      .eq("id", torneo_id)
      .single();

    if (torneoError || !torneo) {
      return res.status(404).json({ message: "Torneo no encontrado." });
    }

    if (torneo.cupos_actuales >= torneo.cupos_maximos) {
      return res
        .status(400)
        .json({ message: "El torneo ya no tiene cupos disponibles." });
    }

    // 4. Inserción de la Inscripción
    const { data: nuevaInscripcion, error: insError } = await supabase
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
      .select()
      .single();

    if (insError) throw insError;

    // 5. Atomicidad: Incrementar cupos en tabla torneos
    const { error: updateError } = await supabase
      .from("torneos")
      .update({ cupos_actuales: torneo.cupos_actuales + 1 })
      .eq("id", torneo_id);

    if (updateError) throw updateError;

    res.status(201).json(nuevaInscripcion);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res.status(500).json({
      message: "Error interno al procesar inscripción",
      error: message,
    });
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
