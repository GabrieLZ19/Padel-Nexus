import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";

export const ReservasController = {
  // Crear una reserva (ya sea manual o automática por partido)
  async crearReserva(req: Request, res: Response) {
    try {
      const { cancha_id, fecha, hora_inicio, duracion, usuario_id } = req.body;

      // 1. Validar disponibilidad (Evitar solapamiento)
      const { data: reservaExistente } = await supabaseAdmin
        .from("reservas")
        .select("id")
        .eq("cancha_id", cancha_id)
        .eq("fecha", fecha)
        .eq("hora_inicio", hora_inicio); // Aquí deberías agregar lógica de rango horario

      if (reservaExistente && reservaExistente.length > 0) {
        return res
          .status(409)
          .json({ message: "La cancha ya está reservada en ese horario." });
      }

      // 2. Crear la reserva
      const { data, error } = await supabaseAdmin
        .from("reservas")
        .insert([
          {
            cancha_id,
            fecha,
            hora_inicio,
            duracion,
            usuario_id,
            estado: "Confirmada",
          },
        ])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error) {
      res.status(500).json({ message: "Error al crear la reserva", error });
    }
  },

  async getReservasPorClub(req: Request, res: Response) {
    const { club_id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("reservas")
      .select("*, canchas(nombre)")
      .eq("canchas.club_id", club_id); // Filtro relacional

    res.json(data);
  },
};
