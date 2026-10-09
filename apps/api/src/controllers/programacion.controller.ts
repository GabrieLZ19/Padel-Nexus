import { Request, Response } from "express";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";
import { ProgramacionService } from "../services/programacion.service";

async function rechazarSiNoEdita(
  req: Request,
  torneoId: string,
  res: Response,
): Promise<Response | null> {
  const decision = await AlcanceCuentaService.consultar(req.user, torneoId, "editar");
  if (decision.permitido) return null;
  return res.status(403).json({
    message: decision.motivo || "No tenés permiso para cambiar este torneo.",
  });
}

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
    const ver = await AlcanceCuentaService.consultar(req.user, id, "ver");
    if (!ver.permitido) {
      return res.status(403).json({
        message: ver.motivo || "No tenés permiso para ver este torneo.",
      });
    }
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
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
    const jornadas = req.query.jornadas
      ? Number(req.query.jornadas)
      : undefined;
    const descansoModo = req.query.descansoModo;
    const ver = await AlcanceCuentaService.consultar(req.user, id, "ver");
    if (!ver.permitido) {
      return res.status(403).json({
        message: ver.motivo || "No tenés permiso para ver este torneo.",
      });
    }
    const editar = await AlcanceCuentaService.consultar(req.user, id, "editar");
    const data = await ProgramacionService.getBoard(id, {
      duracionMinutos: Number.isFinite(duracion) ? duracion : undefined,
      descansoMinutos: Number.isFinite(descanso) ? descanso : undefined,
      descansoModo:
        descansoModo === "tras_fin_60" ||
        descansoModo === "tras_fin_120" ||
        descansoModo === "entre_inicios_240"
          ? descansoModo
          : undefined,
      jornadas:
        jornadas === 1 || jornadas === 2 || jornadas === 3 || jornadas === 4
          ? jornadas
          : undefined,
      horaInicio:
        typeof req.query.horaInicio === "string"
          ? req.query.horaInicio
          : undefined,
      horaFin:
        typeof req.query.horaFin === "string" ? req.query.horaFin : undefined,
    });
    return res.status(200).json({
      ...data,
      solo_lectura: !editar.permitido,
      aviso_alcance: editar.permitido ? null : editar.motivo,
    });
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
    const {
      estrategia,
      distribucion,
      duracionMinutos,
      descansoMinutos,
      descansoModo,
      jornadas,
      horaInicio,
      horaFin,
      motivo,
    } = req.body || {};
    const data = await ProgramacionService.autoAsignar(id, {
      estrategia,
      distribucion,
      duracionMinutos,
      descansoMinutos,
      descansoModo,
      jornadas,
      horaInicio,
      horaFin,
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

/** POST /api/torneos/:id/programacion/borrador */
export const guardarBorradorProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
    const {
      motivo,
      duracionMinutos,
      descansoMinutos,
      descansoModo,
      jornadas,
      horaInicio,
      horaFin,
    } = req.body || {};
    const data = await ProgramacionService.guardarBorrador(id, {
      motivo,
      duracionMinutos,
      descansoMinutos,
      descansoModo,
      jornadas,
      horaInicio,
      horaFin,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(400).json({
      message: "No se pudo guardar el borrador",
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
    const bloqueo = await rechazarSiNoEdita(req, id, res);
    if (bloqueo) return bloqueo;
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
