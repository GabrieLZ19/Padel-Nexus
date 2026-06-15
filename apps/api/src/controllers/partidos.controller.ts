import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const PartidosController = {
  // Publicar partido para "busco cuarto"
  async publicarPartidoAbierto(req: Request, res: Response) {
    try {
      const { club_id, categoria, franja_horaria, cupos_totales } = req.body;
      const usuario_id = req.user?.id; // Obtenido del middleware de auth

      const { data, error } = await supabase
        .from("partidos")
        .insert([
          {
            es_abierto: true,
            club_id,
            categoria,
            franja_horaria,
            cupos_totales,
            cupos_ocupados: 1, // El que publica es el primer jugador
            estado_partido: "Buscando jugadores",
            creador_id: usuario_id,
          },
        ])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error) {
      res.status(500).json({ message: "Error al publicar partido", error });
    }
  },

  // Listar partidos abiertos con filtros
  async getPartidosAbiertos(req: Request, res: Response) {
    try {
      const { categoria, club_id } = req.query;

      let query = supabase
        .from("partidos")
        .select(`*, clubes(nombre, direccion)`)
        .eq("es_abierto", true)
        .eq("estado_partido", "Buscando jugadores");

      if (categoria) query = query.eq("categoria", categoria);
      if (club_id) query = query.eq("club_id", club_id);

      const { data, error } = await query;
      if (error) throw error;

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: "Error al listar partidos", error });
    }
  },

  // Unirse a un partido abierto existente
  async unirseAPartido(req: Request, res: Response) {
    try {
      const { partido_id } = req.params;
      const usuario_id = req.user?.id;

      // 1. Obtener estado actual del partido
      const { data: partido, error: pError } = await supabase
        .from("partidos")
        .select("cupos_totales, cupos_ocupados")
        .eq("id", partido_id)
        .single();

      if (pError || !partido) {
        return res.status(404).json({ message: "Partido no encontrado" });
      }

      // 2. Validación de cupos
      if (partido.cupos_ocupados >= partido.cupos_totales) {
        return res.status(400).json({ message: "El partido ya está lleno" });
      }

      // 3. Registrar al usuario en el partido (necesitas una tabla intermedia 'inscripciones_partido')
      const { error: insError } = await supabase
        .from("inscripciones_partido")
        .insert([{ partido_id, usuario_id }]);

      if (insError) throw insError;

      // 4. Actualizar contador de ocupados
      const { error: updError } = await supabase
        .from("partidos")
        .update({
          cupos_ocupados: partido.cupos_ocupados + 1,
          // Si al sumar llegamos al total, cambiamos estado
          estado_partido:
            partido.cupos_ocupados + 1 >= partido.cupos_totales
              ? "Completo"
              : "Buscando jugadores",
        })
        .eq("id", partido_id);

      if (updError) throw updError;

      res
        .status(200)
        .json({ message: "Te has unido al partido correctamente" });
    } catch (error) {
      res
        .status(500)
        .json({ message: "Error al intentar unirse al partido", error });
    }
  },
};
