import { Request, Response } from "express";
import { ClasificacionService } from "../services/clasificacion.service";

export const obtenerPosicionesZona = async (
  req: Request,
  res: Response,
): Promise<Response | void> => {
  try {
    const { id: torneoId } = req.params;
    const { zona, capacidad } = req.query; // Ej: ?zona=Zona A&capacidad=4

    if (!torneoId || !zona || !capacidad) {
      return res.status(400).json({
        exito: false,
        error:
          "Faltan parámetros obligatorios. Se requiere el ID del torneo, el nombre de la zona y su capacidad.",
      });
    }

    const capacidadNum = parseInt(capacidad as string, 10);

    if (isNaN(capacidadNum) || (capacidadNum !== 3 && capacidadNum !== 4)) {
      return res.status(400).json({
        exito: false,
        error: "La capacidad de la zona debe ser un número válido (3 o 4).",
      });
    }

    // Llamamos a nuestro motor matemático
    const posiciones = await ClasificacionService.calcularPosicionesZona(
      torneoId,
      zona as string,
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
        : "Error matemático al calcular las posiciones.";
    console.error("[Clasificacion Error]:", message);

    return res.status(500).json({
      exito: false,
      error: message,
    });
  }
};
