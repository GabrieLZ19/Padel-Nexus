import { Request, Response } from "express";
import { ChatService } from "../services/chat.service";

export class ChatController {
  /**
   * GET /api/mensajes/conversaciones
   * Lista todas las conversaciones del usuario autenticado.
   */
  static async listarConversaciones(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.id;
      const data = await ChatService.obtenerConversaciones(usuarioId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  }

  /**
   * GET /api/mensajes/conversaciones/:id
   * Obtiene el historial de mensajes de una conversación específica (paginado).
   */
  static async obtenerMensajes(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const usuarioId = req.user!.id;
      const cursor = req.query.cursor as string | undefined;

      const data = await ChatService.obtenerMensajes(id, usuarioId, cursor);
      return res.status(200).json({ exito: true, ...data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      const status = message.includes("No tiene acceso") ? 403 : 500;
      return res.status(status).json({ exito: false, error: message });
    }
  }

  /**
   * POST /api/mensajes/conversaciones
   * Inicia una conversación directa con otro usuario.
   */
  static async iniciarConversacion(req: Request, res: Response) {
    try {
      const creadorId = req.user!.id;
      const { destinatario_id } = req.body;

      if (!destinatario_id) {
        return res
          .status(400)
          .json({ exito: false, error: "Se requiere destinatario_id." });
      }

      if (destinatario_id === creadorId) {
        return res
          .status(400)
          .json({ exito: false, error: "No puede chatear consigo mismo." });
      }

      const data = await ChatService.iniciarConversacion(
        creadorId,
        destinatario_id,
      );
      return res
        .status(data.nueva ? 201 : 200)
        .json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * POST /api/mensajes/soporte
   * Inicia una conversación de soporte (auto-asigna admin).
   */
  static async iniciarSoporte(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.id;
      const data = await ChatService.iniciarConversacionSoporte(usuarioId);
      return res
        .status(data.nueva ? 201 : 200)
        .json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  }

  /**
   * GET /api/mensajes/no-leidos
   * Retorna el total de mensajes no leídos del usuario.
   */
  static async contarNoLeidos(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.id;
      const total = await ChatService.contarNoLeidos(usuarioId);
      return res.status(200).json({ exito: true, total });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error desconocido";
      return res.status(500).json({ exito: false, error: message });
    }
  }
}
