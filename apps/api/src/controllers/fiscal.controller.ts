import { Request, Response } from "express";
import { FiscalService } from "../services/fiscal.service";

export const listarFiscales = async (req: Request, res: Response): Promise<Response> => {
  try {
    const list = await FiscalService.listarFiscales();
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Error al listar fiscales", error: error.message });
  }
};

export const crearFiscal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const datos = req.body;
    const nuevo = await FiscalService.crearFiscal(datos);
    return res.status(201).json(nuevo);
  } catch (error: any) {
    return res.status(400).json({ message: "Error al crear fiscal", error: error.message });
  }
};

export const buscarFiscalPorDni = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { dni } = req.params;
    const fiscal = await FiscalService.buscarPorDni(dni);
    if (!fiscal) {
      return res.status(404).json({ message: "Fiscal no encontrado" });
    }
    return res.status(200).json(fiscal);
  } catch (error: any) {
    return res.status(500).json({ message: "Error al buscar fiscal", error: error.message });
  }
};

export const obtenerFiscalesTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const list = await FiscalService.obtenerFiscalesTorneo(id);
    return res.status(200).json(list);
  } catch (error: any) {
    return res.status(500).json({ message: "Error al obtener fiscales del torneo", error: error.message });
  }
};

export const asignarFiscalesTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { dnis } = req.body;
    const asignados = await FiscalService.asignarFiscalesTorneo(id, dnis);
    return res.status(200).json({ message: "Fiscales asignados correctamente", asignados });
  } catch (error: any) {
    return res.status(400).json({ message: "Error al asignar fiscales", error: error.message });
  }
};
