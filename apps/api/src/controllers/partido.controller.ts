import { Request, Response } from "express";
import { PartidoService } from "../services/partido.service";

export const PartidosController = {
  async publicarPartidoAbierto(req: Request, res: Response): Promise<Response> {
    try {
      const { reserva_id, nivel_requerido, jugadores_faltantes, notas } =
        req.body;
      const creadorId = req.user?.id;

      if (
        !reserva_id ||
        !nivel_requerido ||
        !jugadores_faltantes ||
        !creadorId
      ) {
        return res
          .status(400)
          .json({
            exito: false,
            error: "Faltan datos obligatorios para abrir el partido.",
          });
      }

      const data = await PartidoService.publicarPartidoAbierto({
        reservaId: reserva_id,
        creadorId,
        nivelRequerido: nivel_requerido,
        jugadoresFaltantes: Number(jugadores_faltantes),
        notas,
      });

      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al crear el partido abierto.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async getPartidosAbiertos(req: Request, res: Response): Promise<Response> {
    try {
      const { nivel_requerido } = req.query;
      const data = await PartidoService.obtenerPartidosAbiertos(
        nivel_requerido as string | undefined,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al buscar partidos abiertos.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async unirseAPartido(req: Request, res: Response): Promise<Response> {
    try {
      const { partido_id } = req.params;
      const jugadorId = req.user?.id;

      if (!partido_id || !jugadorId) {
        return res
          .status(400)
          .json({ exito: false, error: "Parámetros de solicitud inválidos." });
      }

      const resultado = await PartidoService.unirseAPartidoExistente(
        partido_id,
        jugadorId,
      );
      return res.status(200).json({
        exito: true,
        mensaje: "Te has unido al partido correctamente.",
        ...resultado,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al intentar unirse al partido.";
      return res.status(400).json({ exito: false, error: message });
    }
  },
};
