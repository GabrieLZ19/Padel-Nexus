import { Request, Response } from "express";
import { AsociacionService } from "../services/asociacion.service";

export const listarAsociaciones = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { search, provincia } = req.query;
    const list = await AsociacionService.listarAsociaciones({
      search: search as string,
      provincia: provincia as string,
    });
    return res.status(200).json({ exito: true, data: list });
  } catch (error: any) {
    return res.status(500).json({ exito: false, message: "Error al listar asociaciones", error: error.message });
  }
};

export const obtenerAsociacionPorId = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const item = await AsociacionService.obtenerPorId(id);
    if (!item) {
      return res.status(404).json({ exito: false, message: "Asociación no encontrada" });
    }
    return res.status(200).json({ exito: true, data: item });
  } catch (error: any) {
    return res.status(500).json({ exito: false, message: "Error al obtener asociación", error: error.message });
  }
};

export const obtenerClubesAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const clubes = await AsociacionService.obtenerClubes(id);
    return res.status(200).json({ exito: true, data: clubes });
  } catch (error: any) {
    return res.status(500).json({ exito: false, message: "Error al obtener clubes de la asociación", error: error.message });
  }
};

export const obtenerTorneosAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const torneos = await AsociacionService.obtenerTorneosPorAsociacion(id);
    return res.status(200).json({ exito: true, data: torneos });
  } catch (error: any) {
    return res.status(500).json({ exito: false, message: "Error al obtener torneos de la asociación", error: error.message });
  }
};

export const obtenerJugadoresAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const jugadores = await AsociacionService.obtenerJugadoresPorAsociacion(id);
    return res.status(200).json({ exito: true, data: jugadores });
  } catch (error: any) {
    return res.status(500).json({ exito: false, message: "Error al obtener jugadores de la asociación", error: error.message });
  }
};

export const crearAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const nuevo = await AsociacionService.crearAsociacion(req.body);
    return res.status(201).json({ exito: true, data: nuevo });
  } catch (error: any) {
    return res.status(400).json({ exito: false, message: error.message });
  }
};

export const actualizarAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const actualizado = await AsociacionService.actualizarAsociacion(id, req.body);
    return res.status(200).json({ exito: true, data: actualizado });
  } catch (error: any) {
    return res.status(400).json({ exito: false, message: error.message });
  }
};

export const cambiarEstadoAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const actualizado = await AsociacionService.cambiarEstado(id, estado);
    return res.status(200).json({ exito: true, data: actualizado });
  } catch (error: any) {
    return res.status(400).json({ exito: false, message: error.message });
  }
};
