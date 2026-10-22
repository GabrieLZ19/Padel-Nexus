import { Request, Response } from "express";
import { ClasificacionService } from "../services/clasificacion.service";

export const obtenerPosicionesZona = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id: torneoId, nombreZona } = req.params;
    const zona = nombreZona || (req.query.zona as string);
    const { capacidad } = req.query;

    if (!torneoId || !zona) {
      return res.status(400).json({
        exito: false,
        error:
          "Faltan parámetros obligatorios. Se requiere el ID del torneo y el nombre de la zona.",
      });
    }

    const capacidadNum = capacidad ? parseInt(capacidad as string, 10) : 4;

    const posiciones = await ClasificacionService.calcularPosicionesZona(
      torneoId,
      zona,
      capacidadNum,
    );

    return res.status(200).json({
      exito: true,
      data: posiciones,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Error al calcular las posiciones de la zona.";
    console.error("[Clasificacion Error]:", message);

    return res.status(500).json({
      exito: false,
      error: message,
    });
  }
};

export const resolverSorteoZona = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id: torneoId, nombreZona } = req.params;
    const zona = nombreZona || (req.body.nombreZona as string) || (req.query.zona as string);
    const { resoluciones, motivo, metodo } = req.body;

    if (!torneoId || !zona || !resoluciones || !Array.isArray(resoluciones)) {
      return res.status(400).json({
        exito: false,
        error:
          "Faltan parámetros obligatorios: ID de torneo, nombre de zona y resoluciones de posiciones.",
      });
    }

    const posiciones = await ClasificacionService.resolverSorteoZona(
      torneoId,
      zona,
      resoluciones,
      motivo,
      metodo || "manual",
      req.user?.id,
    );

    return res.status(200).json({
      exito: true,
      mensaje: "Sorteo reglamentario FAP registrado y auditado correctamente.",
      data: posiciones,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al registrar sorteo de zona.";
    console.error("[resolverSorteoZona Error]:", message);

    return res.status(500).json({
      exito: false,
      error: message,
    });
  }
};
