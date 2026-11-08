import { Request, Response } from "express";
import { SitioPublicoService } from "../services/sitioPublico.service";
import { LicenciaService } from "../services/licencia.service";

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

export const verificarLicenciaPublica = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { usuario_id } = req.params;
    const licenciaId =
      typeof req.query.licencia === "string" ? req.query.licencia : undefined;

    const data = await LicenciaService.verificarPublica(usuario_id, licenciaId);
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo verificar el carné.";
    return res.status(500).json({ exito: false, error: message });
  }
};
