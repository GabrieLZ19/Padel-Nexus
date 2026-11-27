import { Request, Response } from "express";
import { CompetenciaService } from "../services/competencia.service";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";

export const generarZonas = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id: torneoId } = req.params;

    if (!torneoId) {
      return res.status(400).json({
        exito: false,
        error: "El ID del torneo es obligatorio.",
      });
    }

    try {
      await AlcanceCuentaService.exigir(req.user, torneoId, "editar");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No tenés permiso para esta acción.";
      return res.status(403).json({ exito: false, error: message });
    }

    const size = req.query.tamanioGrupo ? Number(req.query.tamanioGrupo) : undefined;
    const forzarDestructivo =
      req.body?.forzarDestructivo === true ||
      req.query?.forzarDestructivo === "true";
    const motivo =
      typeof req.body?.motivo === "string" ? req.body.motivo.trim() : undefined;
    const resultado = await CompetenciaService.generarFaseGrupos(
      torneoId,
      size,
      forzarDestructivo,
      {
        motivo,
        adminId: req.user?.id,
      },
    );

    return res.status(200).json(resultado);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al generar las zonas.";
    console.error("[Competencia Error]:", message);

    const status = message.includes("programación está publicada") ? 409 : 400;

    return res.status(status).json({
      exito: false,
      error: message,
    });
  }
};
