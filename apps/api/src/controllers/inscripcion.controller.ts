import { Request, Response } from "express";
import { InscripcionService } from "../services/inscripcion.service";

export const getAllInscripciones = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { torneo_id, page = "1", limit = "10" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const resultado = await InscripcionService.obtenerInscripcionesPaginadas(
      torneo_id as string | undefined,
      pageNum,
      limitNum,
    );

    return res.status(200).json(resultado);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res
      .status(500)
      .json({ message: "Error al obtener inscripciones", error: message });
  }
};

export const createInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      torneo_id,
      usuario_id, // Temporal hasta tener JWT
      jugador1_nombre,
      jugador2_nombre,
      usuario2_email,
      monto,
      letraPrioridad,
    } = req.body;

    // Idealmente sacar el ID del usuario del token de autenticación: req.user.id
    const usuarioSolicitanteId = usuario_id;

    if (!torneo_id || !usuarioSolicitanteId) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const nuevaInscripcion = await InscripcionService.registrarInscripcion({
      torneoId: torneo_id,
      usuarioSolicitanteId,
      jugador1Id: usuarioSolicitanteId, // Asumimos que el que se anota es el J1
      jugador2Email: usuario2_email,
      jugador1Nombre: jugador1_nombre,
      jugador2Nombre: jugador2_nombre,
      monto,
      letraPrioridad,
    });

    return res.status(201).json(nuevaInscripcion);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";

    // Devolvemos 400 (Bad Request) o 403 (Forbidden) en lugar de 500 para errores de validación de negocio.
    return res.status(400).json({
      message: "No se pudo procesar la inscripción.",
      error: message,
    });
  }
};

export const updateEstadoPago = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { estado_pago } = req.body;

    if (!estado_pago)
      return res
        .status(400)
        .json({ message: "Debe enviar un estado de pago válido." });

    const data = await InscripcionService.actualizarEstadoPago(id, estado_pago);

    return res.status(200).json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res
      .status(500)
      .json({ message: "Error al actualizar estado", error: message });
  }
};

export const deleteInscripcion = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    await InscripcionService.cancelarInscripcion(id);

    return res
      .status(200)
      .json({ message: "Inscripción cancelada y cupo liberado" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res
      .status(500)
      .json({ message: "Error al cancelar inscripción", error: message });
  }
};

export const createInscripcionManual = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const {
      torneo_id,
      jugador1_identificador,
      jugador2_identificador,
      monto,
      metodo_pago,
    } = req.body;

    const adminId = req.user?.id;
    if (!adminId) {
      return res.status(401).json({ message: "No autorizado." });
    }

    if (!torneo_id || !jugador1_identificador || monto === undefined || monto === null) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    const nuevaInscripcion = await InscripcionService.registrarInscripcionManual({
      torneoId: torneo_id,
      jugador1Identificador: jugador1_identificador,
      jugador2Identificador: jugador2_identificador,
      monto: Number(monto),
      metodoPago: metodo_pago,
      adminId,
    });

    return res.status(201).json(nuevaInscripcion);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({
      message: "No se pudo procesar la inscripción manual.",
      error: message,
    });
  }
};
