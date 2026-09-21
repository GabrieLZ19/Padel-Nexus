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

const PROGRAMACION_ROLES = [
  "superadmin",
  "admin_federacion",
  "admin_provincial",
  "admin_club",
  "admin",
] as const;

/** GET /api/torneos/:id/programacion/board */
export const getProgramacionBoard = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const duracion = req.query.duracion
      ? Number(req.query.duracion)
      : undefined;
    const descanso = req.query.descanso
      ? Number(req.query.descanso)
      : undefined;
    const data = await ProgramacionService.getBoard(id, {
      duracionMinutos: Number.isFinite(duracion) ? duracion : undefined,
      descansoMinutos: Number.isFinite(descanso) ? descanso : undefined,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo cargar el programador",
      error: err.message,
    });
  }
};

/** PUT /api/torneos/:id/programacion/asignar */
export const asignarProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { partido_id, fecha_iso, cancha_label, motivo } = req.body || {};
    const data = await ProgramacionService.asignar(id, {
      partido_id,
      fecha_iso,
      cancha_label,
      motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo asignar el partido",
      error: err.message,
    });
  }
};

/** PUT /api/torneos/:id/programacion/desasignar */
export const desasignarProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { partido_id, motivo } = req.body || {};
    const data = await ProgramacionService.desasignar(id, {
      partido_id,
      motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo desasignar el partido",
      error: err.message,
    });
  }
};

/** POST /api/torneos/:id/programacion/limpiar */
export const limpiarProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body || {};
    const data = await ProgramacionService.limpiar(id, {
      motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo limpiar la programación",
      error: err.message,
    });
  }
};

/** POST /api/torneos/:id/programacion/auto */
export const autoAsignarProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { estrategia, duracionMinutos, descansoMinutos, motivo } =
      req.body || {};
    const data = await ProgramacionService.autoAsignar(id, {
      estrategia,
      duracionMinutos,
      descansoMinutos,
      motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo auto-asignar",
      error: err.message,
    });
  }
};

/** POST /api/torneos/:id/programacion/nueva-edicion */
export const nuevaEdicionProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const { motivo } = req.body || {};
    const data = await ProgramacionService.abrirNuevaEdicion(id, {
      motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo abrir nueva edición",
      error: err.message,
    });
  }
};

export { PROGRAMACION_ROLES };
