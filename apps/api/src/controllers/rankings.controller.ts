import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.config";

const supabase = createClient(env.SUPABASE.URL, env.SUPABASE.SERVICE_KEY);

export const RankingsController = {
  // Trae la lista de jugadores ordenada por puntos (para armar el podio #1, #2, #3 de tu landing)
  async obtenerRankingGlobal(req: Request, res: Response) {
    try {
      const { categoria, rama } = req.query;

      let query = supabase
        .from("rankings")
        .select("*, perfiles(nombre_completo, avatar_url)") // Ajustá al nombre real de tu columna en perfiles
        .order("puntos", { ascending: false });

      if (categoria) query = query.eq("categoria", categoria);
      if (rama) query = query.eq("rama", rama);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // Endpoint clave para cuando un administrador cargue los resultados de un torneo en el CRM
  async actualizarPuntosJugador(req: Request, res: Response) {
    try {
      const { usuario_id, puntos_a_sumar, categoria } = req.body;

      if (!usuario_id || puntos_a_sumar === undefined) {
        return res.status(400).json({ message: "Faltan datos obligatorios." });
      }

      // 1. Buscamos el registro actual del jugador
      const { data: rankingActual } = await supabase
        .from("rankings")
        .select("puntos")
        .eq("usuario_id", usuario_id)
        .eq("categoria", categoria)
        .single();

      const nuevosPuntos = (rankingActual?.puntos || 0) + puntos_a_sumar;

      // 2. Upsert (inserta o actualiza los puntos dinámicamente)
      const { data, error } = await supabase
        .from("rankings")
        .upsert(
          {
            usuario_id,
            puntos: nuevosPuntos,
            categoria,
            actualizado_hace: "Hace instantes",
          },
          { onConflict: "usuario_id,categoria" },
        )
        .select();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Ranking actualizado con éxito", data });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
