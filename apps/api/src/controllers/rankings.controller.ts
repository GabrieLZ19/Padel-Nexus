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
          perfiles(nombre_completo, categoria_padel),
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

  // Obtiene el ranking global con la posición calculada mediante la vista de SQL
  async obtenerRankingGlobal(req: Request, res: Response) {
    try {
      const { categoria } = req.query;

      let query = supabase
        .from("vista_ranking_posiciones")
        .select("*, perfiles(nombre_completo, avatar_url)")
        .order("posicion", { ascending: true })
        .limit(50); // Límite solicitado

      if (categoria) query = query.eq("categoria", categoria);

      const { data, error } = await query;
      if (error) throw error;

      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // Método transaccional: Actualiza ranking y registra historial
  async actualizarPuntosJugador(req: Request, res: Response) {
    try {
      const { usuario_id, puntos_a_sumar, categoria, torneo_id } = req.body;

      if (!usuario_id || puntos_a_sumar === undefined || !torneo_id) {
        return res.status(400).json({ message: "Faltan datos obligatorios." });
      }

      // 1. Obtener puntos actuales
      const { data: rankingActual } = await supabase
        .from("rankings")
        .select("puntos")
        .eq("usuario_id", usuario_id)
        .eq("categoria", categoria)
        .single();

      const puntosAnteriores = rankingActual?.puntos || 0;
      const nuevosPuntos = puntosAnteriores + puntos_a_sumar;

      // 2. Actualizar tabla rankings
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

      // 3. Registrar en historial (Auditoría)
      const { error: histError } = await supabase
        .from("historial_ranking")
        .insert([
          {
            usuario_id,
            torneo_id,
            puntos_anteriores: puntosAnteriores,
            puntos_nuevos: nuevosPuntos,
          },
        ]);

      if (histError) throw histError;

      return res.status(200).json({
        message: "Ranking e historial actualizados",
        nuevosPuntos,
      });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
