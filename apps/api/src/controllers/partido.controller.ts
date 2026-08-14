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
        return res.status(400).json({
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
      const status =
        message.includes("Solo") ||
        message.includes("Ya existe") ||
        message.includes("debe ser") ||
        message.includes("obligatorio") ||
        message.includes("no existe")
          ? 400
          : 500;
      return res.status(status).json({ exito: false, error: message });
    }
  },

  async getPartidosAbiertos(req: Request, res: Response): Promise<Response> {
    try {
      const { nivel_requerido, provincia, localidad, franja } = req.query;

      const franjaValida =
        franja === "manana" || franja === "tarde" || franja === "noche"
          ? franja
          : undefined;

      const data = await PartidoService.obtenerPartidosAbiertos({
        nivelRequerido: (nivel_requerido as string | undefined) || undefined,
        provincia: (provincia as string | undefined) || undefined,
        localidad: (localidad as string | undefined) || undefined,
        franja: franjaValida,
      });
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
        return res.status(400).json({
          exito: false,
          error: "Parámetros de solicitud inválidos.",
        });
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

  async partidoPorReserva(req: Request, res: Response): Promise<Response> {
    try {
      const { reserva_id } = req.params;
      if (!reserva_id) {
        return res
          .status(400)
          .json({ exito: false, error: "reserva_id requerido." });
      }

      const data = await PartidoService.tienePartidoParaReserva(reserva_id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al consultar partido.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};
