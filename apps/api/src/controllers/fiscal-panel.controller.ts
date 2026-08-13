import { Request, Response } from "express";
import {
  FiscalPanelService,
  type CrearIncidenciaDTO,
  type RevisarInformeDTO,
} from "../services/fiscal-panel.service";

function handleError(res: Response, error: unknown, fallback: string): Response {
  const message = error instanceof Error ? error.message : fallback;
  const status =
    message.includes("asignado") ||
    message.includes("requiere") ||
    message.includes("Solo el Fiscal General")
      ? 403
      : 400;
  return res.status(status).json({ message, error: message });
}

export const FiscalPanelController = {
  async getContexto(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const data = await FiscalPanelService.obtenerContexto(req.fiscal);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al obtener el contexto del fiscal");
    }
  },

  async getTorneos(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const alcance = typeof req.query.alcance === "string" ? req.query.alcance : undefined;
      const data = await FiscalPanelService.listarTorneosAsignados(req.fiscal.id, alcance);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al listar torneos asignados");
    }
  },

  async getTorneo(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const data = await FiscalPanelService.obtenerTorneoAsignado(req.params.id, req.fiscal.id);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al obtener el torneo");
    }
  },

  async getPartidos(req: Request, res: Response): Promise<Response> {
    try {
      const data = await FiscalPanelService.obtenerPartidos(req.params.id);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al obtener partidos");
    }
  },

  async getJugadores(req: Request, res: Response): Promise<Response> {
    try {
      const data = await FiscalPanelService.obtenerJugadores(req.params.id);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al obtener jugadores");
    }
  },

  async getJugador(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const data = await FiscalPanelService.obtenerFichaJugador(
        req.params.jugadorId,
        req.fiscal.id,
      );
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al obtener la ficha del jugador");
    }
  },

  async getIncidencias(req: Request, res: Response): Promise<Response> {
    try {
      const data = await FiscalPanelService.listarIncidencias(req.params.id);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al listar incidencias");
    }
  },

  async postIncidencia(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal || !req.user?.id) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const payload = req.body as CrearIncidenciaDTO;
      const data = await FiscalPanelService.registrarIncidencia(
        req.params.id,
        req.fiscal,
        req.user.id,
        payload,
      );
      return res.status(201).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al registrar el informe");
    }
  },

  async patchIncidencia(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal || !req.user?.id) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const payload = req.body as RevisarInformeDTO;
      const data = await FiscalPanelService.revisarInforme(
        req.params.id,
        req.params.incidenciaId,
        req.fiscal,
        req.user.id,
        payload,
      );
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al revisar el informe");
    }
  },

  async getReporte(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.fiscal) {
        return res.status(403).json({ message: "Ficha de fiscal no resuelta." });
      }
      const data = await FiscalPanelService.obtenerReporte(req.params.id, req.fiscal.id);
      return res.status(200).json(data);
    } catch (error: unknown) {
      return handleError(res, error, "Error al armar el reporte");
    }
  },
};
