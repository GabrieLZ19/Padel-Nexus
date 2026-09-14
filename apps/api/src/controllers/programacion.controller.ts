import { Request, Response } from "express";
import { ProgramacionService } from "../services/programacion.service";

/**
 * GET /api/torneos/:id/programacion/preview
 * Devuelve la programacion tentativa sin persistir.
 * Sirve para que el CRM muestre un "borrador de horarios" antes de publicar.
 */
export const previewProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const data = await ProgramacionService.preview(id);
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo calcular la vista previa",
      error: err.message,
    });
  }
};

/**
 * POST /api/torneos/:id/programacion/reprogramar
 * Body: { motivo?: string }
 *
 * Ejecuta el scheduler completo respetando `horario_bloqueado`. Cuando el
 * torneo esta publicado, `motivo` es obligatorio y queda en auditoria.
 */
export const reprogramarProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body || {};
    const data = await ProgramacionService.reprogramar(id, {
      motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo reprogramar",
      error: err.message,
    });
  }
};

/**
 * POST /api/torneos/:id/programacion/publicar
 * Flippea `programacion_estado` de programado -> publicado.
 * Valida que todos los partidos programables tengan cancha + horario.
 */
export const publicarProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const data = await ProgramacionService.publicar(id, {
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo publicar la programacion",
      error: err.message,
    });
  }
};
