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

export const actualizarFiscal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const actualizado = await FiscalService.actualizarFiscal(id, datos);
    return res.status(200).json(actualizado);
  } catch (error: any) {
    return res.status(400).json({ message: "Error al actualizar fiscal", error: error.message });
  }
};

export const habilitarAccesoFiscal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const email = typeof req.body?.email === "string" ? req.body.email : undefined;
    const password = typeof req.body?.password === "string" ? req.body.password : undefined;
    const acceso = await FiscalService.habilitarAcceso(id, email, password);
    return res.status(200).json(acceso);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al habilitar el acceso";
    return res.status(400).json({ message, error: message });
  }
};

export const cambiarEstadoFiscal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { activo } = req.body;
    const actualizado = await FiscalService.cambiarEstadoFiscal(id, activo);
    return res.status(200).json(actualizado);
  } catch (error: any) {
    return res.status(400).json({ message: "Error al cambiar estado del fiscal", error: error.message });
  }
};

export const buscarFiscalPorDni = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { dni } = req.params;
    const fiscal = await FiscalService.buscarPorDni(dni);
    if (!fiscal) {
      return res.status(200).json(null);
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
    const items = req.body.fiscal_ids || req.body.dnis || req.body.fiscales || [];
    const rolesById = req.body.roles_by_id as
      | Record<string, "general" | "auxiliar">
      | undefined;
    const asignados = await FiscalService.asignarFiscalesTorneo(id, items, rolesById);
    return res.status(200).json({ message: "Fiscales asignados correctamente", asignados });
  } catch (error: any) {
    return res.status(400).json({ message: "Error al asignar fiscales", error: error.message });
  }
};
