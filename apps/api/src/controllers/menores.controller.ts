import { Request, Response } from "express";
import { LegalService } from "../services/legal.service";
import { MenoresService } from "../services/menores.service";
import type { ConsentTipo } from "../constants/legal";

export class LegalController {
  static async getDocumento(req: Request, res: Response): Promise<Response> {
    try {
      const doc = await LegalService.obtenerActivo(String(req.params.tipo));
      return res.status(200).json({ exito: true, data: doc });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener documento.";
      const status = message.includes("inválido") ? 400 : 404;
      return res.status(status).json({ exito: false, error: message });
    }
  }

  static async getVersiones(_req: Request, res: Response): Promise<Response> {
    try {
      const data = await LegalService.obtenerVersionesActivas();
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar versiones.";
      return res.status(500).json({ exito: false, error: message });
    }
  }
}

export class MenoresController {
  static async registrarResponsable(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ exito: false, error: "No autorizado." });
      }
      const resultado = await MenoresService.registrarResponsable(
        userId,
        req.body,
      );
      return res.status(201).json({ exito: true, data: resultado });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al registrar responsable.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async getConsentimientoPorToken(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const data = await MenoresService.obtenerConsentimientoPorToken(
        String(req.params.token),
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener enlace.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async confirmarConsentimiento(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const data = await MenoresService.confirmarConsentimiento(
        String(req.params.token),
        req.body,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al confirmar consentimiento.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async asentimiento(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ exito: false, error: "No autorizado." });
      }
      const data = await MenoresService.registrarAsentimiento(userId, req.body);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al registrar asentimiento.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async getAutorizaciones(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) {
        return res.status(401).json({ exito: false, error: "No autorizado." });
      }
      const playerId = String(req.params.playerId || requesterId);
      const data = await MenoresService.obtenerAutorizaciones(
        playerId,
        requesterId,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al obtener autorizaciones.";
      const status = message.includes("permiso") ? 403 : 400;
      return res.status(status).json({ exito: false, error: message });
    }
  }

  static async revocar(req: Request, res: Response): Promise<Response> {
    try {
      const requesterId = req.user?.id;
      if (!requesterId) {
        return res.status(401).json({ exito: false, error: "No autorizado." });
      }
      const playerId = String(req.body.player_id || requesterId);
      const tipo = String(req.body.tipo) as ConsentTipo;

      // Verificar permiso (mismo gate que GET)
      await MenoresService.obtenerAutorizaciones(playerId, requesterId);

      const data = await MenoresService.revocarAutorizacion(
        playerId,
        tipo,
        requesterId,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al revocar.";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  static async completarTransicionAdulto(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ exito: false, error: "No autorizado." });
      }
      const data = await MenoresService.completarTransicionAdulto(userId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error en transición.";
      return res.status(400).json({ exito: false, error: message });
    }
  }
}
