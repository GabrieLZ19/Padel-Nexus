import { Request, Response } from "express";
import { FederacionService } from "../services/federacion.service";

export const listarFederaciones = async (_req: Request, res: Response) => {
  try {
    const data = await FederacionService.listar();
    return res.json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al listar federaciones";
    return res.status(500).json({
      exito: false,
      message: "Error al listar federaciones",
      error: message,
    });
  }
};

export const obtenerFederacionPorId = async (req: Request, res: Response) => {
  try {
    const data = await FederacionService.obtenerPorId(req.params.id);
    if (!data) {
      return res.status(404).json({ exito: false, message: "Federación no encontrada" });
    }
    return res.json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener federación";
    return res.status(500).json({
      exito: false,
      message: "Error al obtener federación",
      error: message,
    });
  }
};

export const crearFederacion = async (req: Request, res: Response) => {
  try {
    const data = await FederacionService.crear(req.body);
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear federación";
    return res.status(400).json({ exito: false, message });
  }
};

export const actualizarFederacion = async (req: Request, res: Response) => {
  try {
    const data = await FederacionService.actualizar(req.params.id, req.body);
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar federación";
    return res.status(400).json({ exito: false, message });
  }
};

export const cambiarEstadoFederacion = async (req: Request, res: Response) => {
  try {
    const estado = req.body?.estado as "activo" | "inactivo";
    if (estado !== "activo" && estado !== "inactivo") {
      return res.status(400).json({ exito: false, message: "Estado inválido." });
    }
    const data = await FederacionService.cambiarEstado(req.params.id, estado);
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cambiar estado";
    return res.status(400).json({ exito: false, message });
  }
};
