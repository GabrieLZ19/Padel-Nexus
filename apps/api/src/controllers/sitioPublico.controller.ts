import { Request, Response } from "express";
import { SitioPublicoService } from "../services/sitioPublico.service";

export const cifrasSitioPublico = async (
  _req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const cifras = await SitioPublicoService.cifras();
    return res.status(200).json(cifras);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "No se pudieron leer las cifras.";
    return res.status(500).json({ message });
  }
};
