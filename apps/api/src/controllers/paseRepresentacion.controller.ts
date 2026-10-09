import { Request, Response } from "express";
import { PaseRepresentacionService } from "../services/paseRepresentacion.service";

export const PaseRepresentacionController = {
  async solicitar(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const { asociacion_destino_id, motivo } = req.body as {
        asociacion_destino_id?: string;
        motivo?: string;
      };
      if (!usuarioId) return res.status(401).json({ error: "No autorizado." });
      const data = await PaseRepresentacionService.solicitar(
        usuarioId,
        asociacion_destino_id || "",
        motivo || "",
      );
      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo pedir el pase.";
      return res.status(400).json({ error: message });
    }
  },

  async listarMios(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      if (!usuarioId) return res.status(401).json({ error: "No autorizado." });
      const data = await PaseRepresentacionService.listarMios(usuarioId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudieron listar los pases.";
      return res.status(500).json({ error: message });
    }
  },

  async cancelar(req: Request, res: Response): Promise<Response> {
    try {
      const usuarioId = req.user?.id;
      const { id } = req.params;
      if (!usuarioId) return res.status(401).json({ error: "No autorizado." });
      if (!id) return res.status(400).json({ error: "ID requerido." });
      const data = await PaseRepresentacionService.cancelar(usuarioId, id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cancelar el pase.";
      return res.status(400).json({ error: message });
    }
  },

  async listarPendientes(_req: Request, res: Response): Promise<Response> {
    try {
      const data = await PaseRepresentacionService.listarPendientes();
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudieron listar los pases.";
      return res.status(500).json({ error: message });
    }
  },

  async resolver(req: Request, res: Response): Promise<Response> {
    try {
      const adminId = req.user?.id;
      const { id } = req.params;
      const { estado } = req.body as { estado?: "aprobado" | "rechazado" };
      if (!adminId) return res.status(401).json({ error: "No autorizado." });
      if (!id) return res.status(400).json({ error: "ID requerido." });
      if (estado !== "aprobado" && estado !== "rechazado") {
        return res.status(400).json({ error: "El estado tiene que ser aprobado o rechazado." });
      }
      const data = await PaseRepresentacionService.resolver(adminId, id, estado);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo resolver el pase.";
      return res.status(400).json({ error: message });
    }
  },
};
