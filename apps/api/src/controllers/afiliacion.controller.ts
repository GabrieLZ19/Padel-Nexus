import { Request, Response } from "express";
import { AfiliacionService } from "../services/afiliacion.service";

export const AfiliacionController = {
  async solicitar(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const { club_id } = req.body as { club_id?: string };

      if (!usuarioId) {
        return res.status(401).json({ error: "No autorizado." });
      }
      if (!club_id) {
        return res.status(400).json({ error: "club_id es obligatorio." });
      }

      const data = await AfiliacionService.solicitar(usuarioId, club_id);
      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al solicitar afiliación.";
      return res.status(400).json({ error: message });
    }
  },

  async listarMias(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) {
        return res.status(401).json({ error: "No autorizado." });
      }
      const data = await AfiliacionService.listarMias(usuarioId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar afiliaciones.";
      return res.status(500).json({ error: message });
    }
  },

  async cancelar(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const { id } = req.params;
      if (!usuarioId) {
        return res.status(401).json({ error: "No autorizado." });
      }
      if (!id) {
        return res.status(400).json({ error: "ID requerido." });
      }
      const data = await AfiliacionService.cancelar(usuarioId, id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al cancelar afiliación.";
      return res.status(400).json({ error: message });
    }
  },

  async listarAdmin(req: Request, res: Response): Promise<Response> {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const estado =
        typeof req.query.estado === "string" ? req.query.estado : undefined;
      const search =
        typeof req.query.search === "string" ? req.query.search : undefined;

      const resultado = await AfiliacionService.listarAdmin({
        page,
        limit,
        estado,
        search,
      });
      return res.status(200).json({ exito: true, ...resultado });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al listar solicitudes de afiliación.";
      return res.status(500).json({ error: message });
    }
  },

  async cambiarEstado(req: Request, res: Response): Promise<Response> {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { estado } = req.body as { estado?: string };

      if (!adminId) {
        return res.status(401).json({ error: "No autorizado." });
      }
      if (!id || !estado) {
        return res
          .status(400)
          .json({ error: "ID y estado son obligatorios." });
      }

      const data = await AfiliacionService.cambiarEstado(id, estado, adminId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar la afiliación.";
      return res.status(400).json({ error: message });
    }
  },
};
