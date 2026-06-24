import { Request, Response } from "express";
import { RankingService } from "../services/ranking.service";

export const RankingsController = {
  async obtenerPerfilRanking(req: Request, res: Response): Promise<Response> {
    try {
      const { usuario_id } = req.params;
      if (!usuario_id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID del usuario es requerido." });
      }

      const data = await RankingService.obtenerRankingPorUsuario(usuario_id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al obtener la ficha de clasificación.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async obtenerRankingGlobal(req: Request, res: Response): Promise<Response> {
    try {
      const { categoria, alcance } = req.query;

      const data = await RankingService.obtenerRankingGlobal(
        categoria as string | undefined,
        alcance as string | undefined,
      );

      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al procesar el ranking global.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async actualizarPuntosJugador(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const {
        usuario_id,
        puntos_a_sumar,
        categoria,
        torneo_id,
        alcance,
        provincia_jurisdiccion,
      } = req.body;

      if (
        !usuario_id ||
        puntos_a_sumar === undefined ||
        !torneo_id ||
        !categoria
      ) {
        return res
          .status(400)
          .json({
            exito: false,
            error: "Faltan datos obligatorios para procesar los puntos.",
          });
      }

      const nuevosPuntos = await RankingService.actualizarPuntosJugador({
        usuarioId: usuario_id,
        puntosASumar: Number(puntos_a_sumar),
        categoria,
        torneoId: torneo_id,
        alcance,
        provinciaJurisdiccion: provincia_jurisdiccion,
      });

      return res.status(200).json({
        exito: true,
        mensaje: "Puntaje de ranking actualizado correctamente.",
        nuevosPuntos,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al alterar los puntajes del jugador.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};
