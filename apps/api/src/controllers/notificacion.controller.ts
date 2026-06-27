import { Request, Response } from "express";
import { NotificacionService } from "../services/notificacion.service";

export const NotificacionesController = {
  async listar(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ exito: false, message: "Usuario no autenticado." });
      }

      const data = await NotificacionService.obtenerNotificaciones(usuarioId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al obtener notificaciones.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async marcarLeida(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ exito: false, message: "Usuario no autenticado." });
      }

      const data = await NotificacionService.marcarComoLeida(id, usuarioId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al marcar como leída.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async marcarTodasLeidas(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ exito: false, message: "Usuario no autenticado." });
      }

      const data = await NotificacionService.marcarTodasLeidas(usuarioId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al marcar todas como leídas.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async eliminar(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ exito: false, message: "Usuario no autenticado." });
      }

      await NotificacionService.eliminar(id, usuarioId);
      return res.status(200).json({ exito: true, mensaje: "Notificación eliminada correctamente." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar notificación.";
      return res.status(500).json({ exito: false, error: message });
    }
  }
};
