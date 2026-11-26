import { Request, Response } from "express";
import { AsociacionService } from "../services/asociacion.service";

function statusDesdeError(error: unknown, defaultStatus: number): number {
  if (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  return defaultStatus;
}
import { LicenciaOrganizacionService } from "../services/licenciaOrganizacion.service";

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
    await AsociacionService.exigirAsociacionExistente(id);
    const clubes = await AsociacionService.obtenerClubes(id);
    return res.status(200).json({ exito: true, data: clubes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(statusDesdeError(error, 500)).json({
      exito: false,
      message: "Error al obtener clubes de la asociación",
      error: message,
    });
  }
};

export const obtenerTorneosAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    await AsociacionService.exigirAsociacionExistente(id);
    const torneos = await AsociacionService.obtenerTorneosPorAsociacion(id);
    return res.status(200).json({ exito: true, data: torneos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(statusDesdeError(error, 500)).json({
      exito: false,
      message: "Error al obtener torneos de la asociación",
      error: message,
    });
  }
};

export const obtenerJugadoresAsociacion = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    await AsociacionService.exigirAsociacionExistente(id);
    const jugadores = await AsociacionService.obtenerJugadoresPorAsociacion(id);
    return res.status(200).json({ exito: true, data: jugadores });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(statusDesdeError(error, 500)).json({
      exito: false,
      message: "Error al obtener jugadores de la asociación",
      error: message,
    });
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

export const eliminarAsociacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const { id } = req.params;
    const resultado = await AsociacionService.gestionarBaja(id);
    const h = resultado.historial;
    const message =
      resultado.modo === "eliminado"
        ? "La asociación no tenía historial y fue eliminada."
        : `La asociación tiene historial (${h.clubes} clubes, ${h.torneos} torneos, ${h.licencias} licencias, ${h.afiliaciones} afiliaciones, ${h.usuariosAdmin} admins) y quedó inactiva.`;
    return res.status(200).json({ exito: true, ...resultado, message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return res.status(statusDesdeError(error, 400)).json({
      exito: false,
      message,
    });
  }
};

export const obtenerConfigLicenciaAsociacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data = await LicenciaOrganizacionService.obtenerConfigAsociacion(
      req.params.id,
    );
    return res.json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al obtener configuración";
    return res.status(500).json({ exito: false, message });
  }
};

export const actualizarConfigLicenciaAsociacion = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const data = await LicenciaOrganizacionService.actualizarConfigAsociacion(
      req.params.id,
      req.body,
    );
    return res.json({ exito: true, data });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al guardar configuración";
    return res.status(400).json({ exito: false, message });
  }
};
