import { Request, Response } from "express";
import { ClubService } from "../services/club.service";

export const getAllClubes = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { page = "1", limit = "10", search, provincia } = req.query;

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
    const { nombre, provincia, localidad, canchas, estado } = req.body;

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
    const { nombre, provincia, localidad, estado, canchas } = req.body;

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
