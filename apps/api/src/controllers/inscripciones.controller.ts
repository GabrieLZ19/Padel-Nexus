import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllInscripciones = async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from("inscripciones")
      .select(
        `
        id, 
        torneo_id, 
        usuario_id, 
        jugador1_nombre,
        jugador2_nombre, 
        monto, 
        estado_pago, 
        tipo, 
        created_at,
        perfiles!fk_inscripciones_usuario(nombre_completo),
        torneos!fk_inscripciones_torneo(nombre, categoria)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Transformación limpia con prioridad al formulario
    const formattedData = (data || []).map((ins: any) => ({
      ...ins,
      // Si el usuario llenó un nombre personalizado en la inscripción lo usamos,
      // si no, cae al del perfil, y si no hay ninguno, "Usuario Desconocido"
      jugador1_nombre: ins.jugador1_nombre?.trim()
        ? ins.jugador1_nombre
        : ins.perfiles?.nombre_completo || "Usuario Desconocido",
      torneo_nombre: ins.torneos?.nombre || "Torneo no asignado",
      categoria: ins.torneos?.categoria || "-",
    }));

    res.status(200).json(formattedData);
  } catch (error: any) {
    console.error("Error crítico en inscripciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

export const createInscripcion = async (req: Request, res: Response) => {
  try {
    const { torneo_id, usuario_id, jugador1_nombre, jugador2_nombre, monto } =
      req.body;

    // 1. VALIDACIÓN: ¿Tiene licencia activa?
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

    // 2. VALIDACIÓN: ¿Ya está inscrito?
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

    // 3. VALIDACIÓN: Cupos disponibles y Nivel
    const { data: torneo, error: torneoError } = await supabase
      .from("torneos")
      .select("cupos_maximos, cupos_actuales, nivel")
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

    // 3.5. VALIDACIÓN PROFESIONAL: Nivel del jugador vs Nivel Torneo
    const { data: perfil, error: perfilError } = await supabase
      .from("perfiles")
      .select("categoria_padel")
      .eq("id", usuario_id)
      .single();

    if (perfilError || !perfil) {
      return res
        .status(404)
        .json({ message: "Perfil de jugador no encontrado." });
    }

    if (perfil.categoria_padel !== torneo.nivel) {
      return res.status(403).json({
        message: `Tu categoría (${perfil.categoria_padel}) no coincide con la requerida (${torneo.nivel}).`,
      });
    }

    // 4. Inserción de la Inscripción con la data mapeada del Formulario
    const { data: nuevaInscripcion, error: insError } = await supabase
      .from("inscripciones")
      .insert([
        {
          torneo_id,
          usuario_id,
          jugador1_nombre,
          jugador2_nombre,
          monto,
          estado_pago: "Pendiente",
          tipo: "Inscripción torneo",
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
    console.error("Error en createInscripcion:", error);
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

export const deleteInscripcion = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Obtener el torneo_id antes de borrar para actualizar cupos
    const { data: inscripcion, error: fetchError } = await supabase
      .from("inscripciones")
      .select("torneo_id")
      .eq("id", id)
      .single();

    if (fetchError || !inscripcion) {
      return res.status(404).json({ message: "Inscripción no encontrada" });
    }

    // 2. Eliminar la inscripción
    const { error: delError } = await supabase
      .from("inscripciones")
      .delete()
      .eq("id", id);

    if (delError) throw delError;

    // 3. Decrementar cupos en el torneo
    const { data: torneo } = await supabase
      .from("torneos")
      .select("cupos_actuales")
      .eq("id", inscripcion.torneo_id)
      .single();

    if (torneo) {
      await supabase
        .from("torneos")
        .update({ cupos_actuales: Math.max(0, torneo.cupos_actuales - 1) })
        .eq("id", inscripcion.torneo_id);
    }

    res.status(200).json({ message: "Inscripción cancelada y cupo liberado" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    res
      .status(500)
      .json({ message: "Error al cancelar inscripción", error: message });
  }
};
