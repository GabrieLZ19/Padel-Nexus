import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const RankingsController = {
  async obtenerPerfilRanking(req: Request, res: Response) {
    try {
      const { usuario_id } = req.params;

      const { data, error } = await supabase
        .from("rankings")
        .select(
          `
          *, 
          perfiles(nombre_completo, categoria_padel, avatar_url),
          historial_ranking(torneo_id, puntos_nuevos, created_at)
        `,
        )
        .eq("usuario_id", usuario_id)
        .order("created_at", {
          referencedTable: "historial_ranking",
          ascending: false,
        });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  async obtenerRankingGlobal(req: Request, res: Response) {
    try {
      const { categoria } = req.query;

      let query = supabase
        .from("rankings")
        .select(
          `
          *, 
          perfiles!inner(nombre_completo, avatar_url)
        `,
        )
        .order("puntos", { ascending: false }) // Ordenamos por el que tiene más puntos
        .limit(100);

      // Si se filtra por categoría (Ej: "5ª")
      if (categoria && categoria !== "Todas") {
        query = query.eq("categoria", categoria);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Inyectamos la posición real y aseguramos que PJ y PG existan
      const rankingCalculado = (data || []).map((jugador, index) => ({
        ...jugador,
        posicion_actual: index + 1,
        pj: jugador.pj || 0,
        pg: jugador.pg || 0,
        tendencia: jugador.tendencia || 0,
      }));

      return res.status(200).json(rankingCalculado);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // Método manual para que el Admin corrija puntos si es necesario
  async actualizarPuntosJugador(req: Request, res: Response) {
    try {
      const { usuario_id, puntos_a_sumar, categoria, torneo_id } = req.body;

      if (!usuario_id || puntos_a_sumar === undefined || !torneo_id) {
        return res.status(400).json({ message: "Faltan datos obligatorios." });
      }

      const { data: rankingActual } = await supabase
        .from("rankings")
        .select("puntos")
        .eq("usuario_id", usuario_id)
        .eq("categoria", categoria)
        .single();

      const puntosAnteriores = rankingActual?.puntos || 0;
      const nuevosPuntos = puntosAnteriores + puntos_a_sumar;

      const { error: rankError } = await supabase.from("rankings").upsert(
        {
          usuario_id,
          puntos: nuevosPuntos,
          categoria,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "usuario_id,categoria" },
      );

      if (rankError) throw rankError;

      await supabase.from("historial_ranking").insert([
        {
          usuario_id,
          torneo_id,
          puntos_anteriores: puntosAnteriores,
          puntos_nuevos: nuevosPuntos,
        },
      ]);

      return res
        .status(200)
        .json({ message: "Ranking actualizado manual", nuevosPuntos });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
