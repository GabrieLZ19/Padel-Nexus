import { Request, Response } from "express";
import { ClubService } from "../services/club.service";

export const getAllClubes = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { page = "1", limit = "10", search, provincia, lat, lng, radio } = req.query;

    // Si se proporcionan coordenadas, usar búsqueda geográfica
    if (lat && lng) {
      const latNum = parseFloat(lat as string);
      const lngNum = parseFloat(lng as string);
      const radioKm = radio ? parseFloat(radio as string) : 50;

      if (isNaN(latNum) || isNaN(lngNum)) {
        return res.status(400).json({ exito: false, error: "Coordenadas inválidas." });
      }

      const data = await ClubService.buscarCercanos(latNum, lngNum, radioKm);
      return res.status(200).json({ exito: true, data, total: data.length });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const resultado = await ClubService.obtenerClubesPaginados(
      pageNum,
      limitNum,
      search as string | undefined,
      provincia as string | undefined,
    );

    return res.status(200).json({ exito: true, ...resultado });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const getClubById = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ exito: false, error: "ID del club requerido." });

    const data = await ClubService.obtenerClubPorId(id);
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(404).json({ exito: false, error: message });
  }
};

export const createClub = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { nombre, provincia, localidad, canchas, estado, latitud, longitud } = req.body;

    if (!nombre || !provincia) {
      return res
        .status(400)
        .json({ exito: false, error: "Nombre y provincia son obligatorios." });
    }

    const data = await ClubService.crearClub({
      nombre,
      provincia,
      localidad,
      canchas,
      estado,
      latitud: latitud ?? null,
      longitud: longitud ?? null,
    });
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message });
  }
};

export const updateClub = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const { nombre, provincia, localidad, estado, canchas, latitud, longitud } = req.body;

    if (!id)
      return res
        .status(400)
        .json({ exito: false, error: "ID del club requerido." });

    const data = await ClubService.actualizarClub(id, {
      nombre,
      provincia,
      localidad,
      estado,
      canchas,
      latitud,
      longitud,
    });
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(400).json({ exito: false, error: message });
  }
};

export const deleteClub = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id } = req.params;

    if (!id)
      return res
        .status(400)
        .json({ exito: false, error: "ID del club requerido." });

    await ClubService.desactivarClub(id);
    return res
      .status(200)
      .json({ exito: true, message: "Club desactivado correctamente." });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

// ── Canchas Controladores ──────────────────────────────────────────────

export const getCanchasPorClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // clubId
    const data = await ClubService.obtenerCanchasPorClub(id);
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const createCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // clubId
    const { nombre, tipo_suelo, techada } = req.body;

    if (!nombre) {
      return res.status(400).json({ exito: false, error: "El nombre es obligatorio." });
    }

    const data = await ClubService.crearCancha(id, { nombre, tipo_suelo, techada });
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const updateCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // canchaId
    const { nombre, tipo_suelo, techada, activa } = req.body;

    const data = await ClubService.actualizarCancha(id, { nombre, tipo_suelo, techada, activa });
    return res.status(200).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const deleteCancha = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // canchaId
    await ClubService.eliminarCancha(id);
    return res.status(200).json({ exito: true, message: "Cancha eliminada correctamente." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

// ── Turnos Controladores ───────────────────────────────────────────────

export const createTurno = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // canchaId
    const { hora_inicio, hora_fin, precio, dia_semana } = req.body;

    if (!hora_inicio || !hora_fin || !precio || dia_semana === undefined) {
      return res.status(400).json({ exito: false, error: "Todos los campos de turno son obligatorios." });
    }

    const data = await ClubService.crearTurno(id, { hora_inicio, hora_fin, precio, dia_semana });
    return res.status(201).json({ exito: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};

export const deleteTurno = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // turnoId
    await ClubService.eliminarTurno(id);
    return res.status(200).json({ exito: true, message: "Turno eliminado correctamente." });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(500).json({ exito: false, error: message });
  }
};
