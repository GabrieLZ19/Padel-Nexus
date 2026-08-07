import { Request, Response } from "express";
import { FederacionService } from "../services/federacion.service";

export const listarFederaciones = async (_req: Request, res: Response) => {
  try {
    const data = await FederacionService.listar();
    return res.json({ exito: true, data });
  } catch (error: any) {
    return res.status(500).json({
      exito: false,
      message: "Error al listar federaciones",
      error: error.message,
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
  } catch (error: any) {
    return res.status(500).json({
      exito: false,
      message: "Error al obtener federación",
      error: error.message,
    });
  }
};
