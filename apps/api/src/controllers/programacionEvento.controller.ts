import { Request, Response } from "express";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";
import { ProgramacionEventoService } from "../services/programacionEvento.service";
import { cargarMetaEvento } from "../utils/programacionEvento";

async function exigirEdicionEvento(
  req: Request,
  grupoId: string,
  res: Response,
): Promise<Response | null> {
  const meta = await cargarMetaEvento(grupoId);
  for (const torneo of meta.torneos) {
    const decision = await AlcanceCuentaService.consultar(
      req.user,
      torneo.id,
      "editar",
    );
    if (!decision.permitido) {
      return res.status(403).json({
        message:
          decision.motivo ||
          "No tenés permiso para editar una categoría de este evento.",
      });
    }
  }
  return null;
}

async function exigirVerEvento(
  req: Request,
  grupoId: string,
  res: Response,
): Promise<Response | null> {
  const meta = await cargarMetaEvento(grupoId);
  let permitido = false;
  for (const torneo of meta.torneos) {
    const decision = await AlcanceCuentaService.consultar(
      req.user,
      torneo.id,
      "ver",
    );
    if (decision.permitido) {
      permitido = true;
      break;
    }
  }
  if (!permitido) {
    return res.status(403).json({ message: "No tenés permiso para ver este evento." });
  }
  return null;
}

export const getEventoProgramacionBoard = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirVerEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const data = await ProgramacionEventoService.getBoard(grupoId, {
      duracionMinutos: req.query.duracion
        ? Number(req.query.duracion)
        : undefined,
      descansoModo: typeof req.query.descansoModo === "string"
        ? (req.query.descansoModo as import("../utils/programadorReglas").ModoDescanso)
        : undefined,
      jornadas: req.query.jornadas ? Number(req.query.jornadas) : undefined,
      horaInicio: typeof req.query.horaInicio === "string"
        ? req.query.horaInicio
        : undefined,
      horaFin: typeof req.query.horaFin === "string"
        ? req.query.horaFin
        : undefined,
      franjasPorDia:
        typeof req.query.franjasPorDia === "string"
          ? (JSON.parse(req.query.franjasPorDia) as Record<
              string,
              { inicio?: string; fin?: string }
            >)
          : undefined,
    });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "No se pudo cargar el programador del evento", error: msg });
  }
};

export const asignarEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const data = await ProgramacionEventoService.asignar(grupoId, {
      partido_id: req.body.partido_id,
      cancha_label: req.body.cancha_label,
      fecha_iso: req.body.fecha_iso,
      motivo: req.body.motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "No se pudo asignar", error: msg });
  }
};

export const desasignarEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const data = await ProgramacionEventoService.desasignar(grupoId, {
      partido_id: req.body.partido_id,
      motivo: req.body.motivo,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "No se pudo desasignar", error: msg });
  }
};

export const limpiarEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const data = await ProgramacionEventoService.limpiar(grupoId, {
      motivo: req.body.motivo,
      adminId: req.user?.id,
      torneo_id: req.body.torneo_id,
    });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "No se pudo limpiar", error: msg });
  }
};

export const autoAsignarEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const data = await ProgramacionEventoService.autoAsignar(grupoId, {
      ...req.body,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "No se pudo auto-asignar", error: msg });
  }
};

export const publicarEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const data = await ProgramacionEventoService.publicar(grupoId, {
      torneo_ids: req.body.torneo_ids,
      adminId: req.user?.id,
    });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "No se pudo publicar", error: msg });
  }
};

export const resolverGrupoProgramacionPorTorneo = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data = await ProgramacionEventoService.resolverGrupoDesdeTorneo(
      req.params.torneoId,
    );
    return res.status(200).json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ error: msg });
  }
};

export const guardarSedesEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const clubIds = Array.isArray(req.body.club_ids) ? req.body.club_ids : [];
    await ProgramacionEventoService.guardarSedesEvento(grupoId, clubIds);
    return res.status(200).json({ message: "Sedes del evento guardadas correctamente" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({ message: "Error al guardar sedes del evento", error: msg });
  }
};

export const guardarOrdenCategoriasEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const ordenTorneoIds = Array.isArray(req.body.orden_torneo_ids)
      ? req.body.orden_torneo_ids.map((id: unknown) => String(id))
      : [];
    const orden = await ProgramacionEventoService.guardarOrdenCategoriasEvento(
      grupoId,
      ordenTorneoIds,
    );
    return res.status(200).json({
      message: "Orden de categorías guardado",
      orden_categorias: orden,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({
      message: "Error al guardar orden de categorías",
      error: msg,
    });
  }
};

export const guardarCanchasDisponibilidadEventoProgramacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const grupoId = req.params.grupoId;
    const bloqueo = await exigirEdicionEvento(req, grupoId, res);
    if (bloqueo) return bloqueo;
    const disponibilidad = Array.isArray(req.body.disponibilidad)
      ? req.body.disponibilidad
      : [];
    await ProgramacionEventoService.guardarCanchasDisponibilidadEvento(
      grupoId,
      disponibilidad,
    );
    return res.status(200).json({
      message: "Disponibilidad de canchas del evento guardada correctamente",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return res.status(400).json({
      message: "Error al guardar disponibilidad del evento",
      error: msg,
    });
  }
};