import { Request, Response } from "express";
import { CompetenciaService } from "../services/competencia.service";

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

    // Aquí podríamos agregar una validación extra para asegurar que req.user.rol sea Admin
    // if (req.user?.rol === 'usuario') return res.status(403).json({...})

    const size = req.query.tamanioGrupo ? Number(req.query.tamanioGrupo) : undefined;
    const resultado = await CompetenciaService.generarFaseGrupos(torneoId, size);

    return res.status(200).json(resultado);
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al generar las zonas.";
    console.error("[Competencia Error]:", message);

    return res.status(400).json({
      exito: false,
      error: message,
    });
  }
};
