import { Request, Response } from "express";
import type { RolUsuario } from "../constants/roles";
import { ComunicacionesService } from "../services/comunicaciones.service";

function getActor(req: Request): { id: string; rol: RolUsuario } {
  return {
    id: req.user!.id,
    rol: (req.user!.rol || "usuario") as RolUsuario,
  };
}

export class ComunicacionesController {
  static async buscarContactos(req: Request, res: Response) {
    try {
      const actor = getActor(req);
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const data = await ComunicacionesService.buscarContactos(
        actor.id,
        actor.rol,
        q,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al buscar contactos.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async listarListas(req: Request, res: Response) {
    try {
      const { id } = getActor(req);
      const data = await ComunicacionesService.listarListas(id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar listas.";
      return res.status(500).json({ exito: false, error: message });
    }
  }

  static async obtenerLista(req: Request, res: Response) {
    try {
      const { id } = getActor(req);
      const listaId = req.params.id;
      const data = await ComunicacionesService.obtenerLista(id, listaId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener lista.";
      const status = message.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({ exito: false, error: message });
    }
  }

  static async crearLista(req: Request, res: Response) {
    try {
      const { id } = getActor(req);
      const data = await ComunicacionesService.crearLista(id, req.body);
      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al crear lista.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async actualizarLista(req: Request, res: Response) {
    try {
      const { id } = getActor(req);
      const data = await ComunicacionesService.actualizarLista(
        id,
        req.params.id,
        req.body,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al actualizar lista.";
      const status = message.includes("no encontrada") ? 404 : 400;
      return res.status(status).json({ exito: false, error: message });
    }
  }

  static async eliminarLista(req: Request, res: Response) {
    try {
      const { id } = getActor(req);
      await ComunicacionesService.eliminarLista(id, req.params.id);
      return res.status(200).json({ exito: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar lista.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async previewAudiencia(req: Request, res: Response) {
    try {
      const actor = getActor(req);
      const data = await ComunicacionesService.previewAudiencia(
        actor.id,
        actor.rol,
        req.body,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al previsualizar audiencia.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async enviarCampana(req: Request, res: Response) {
    try {
      const actor = getActor(req);
      const data = await ComunicacionesService.enviarCampana(
        actor.id,
        actor.rol,
        req.body,
      );
      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al enviar campaña.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async listarCampanas(req: Request, res: Response) {
    try {
      const { id } = getActor(req);
      const limit = req.query.limit
        ? Number.parseInt(String(req.query.limit), 10)
        : undefined;
      const offset = req.query.offset
        ? Number.parseInt(String(req.query.offset), 10)
        : undefined;

      const data = await ComunicacionesService.listarCampanas(id, {
        limit: Number.isFinite(limit) ? limit : undefined,
        offset: Number.isFinite(offset) ? offset : undefined,
      });
      return res.status(200).json({ exito: true, ...data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar campañas.";
      return res.status(500).json({ exito: false, error: message });
    }
  }
}
