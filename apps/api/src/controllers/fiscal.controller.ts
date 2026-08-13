import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { FiscalService } from "../services/fiscal.service";

export const listarFiscales = async (req: Request, res: Response): Promise<Response> => {
  try {
    const asociacionId =
      typeof req.query.asociacion_id === "string" ? req.query.asociacion_id : null;
    const list = await FiscalService.listarFiscales(asociacionId);
    return res.status(200).json(list);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al listar fiscales";
    return res.status(500).json({ message, error: message });
  }
};

export const crearFiscal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const datos = { ...req.body };
    if (!datos.asociacion_id && datos.asociacion) {
      const { data } = await supabaseAdmin
        .from("asociaciones")
        .select("id")
        .ilike("sigla", String(datos.asociacion))
        .maybeSingle();
      if (data?.id) datos.asociacion_id = data.id;
    }
    const nuevo = await FiscalService.crearFiscal(datos);
    return res.status(201).json(nuevo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al crear fiscal";
    return res.status(400).json({ message, error: message });
  }
};

export const actualizarFiscal = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const datos = req.body;
    const actualizado = await FiscalService.actualizarFiscal(id, datos);
    return res.status(200).json(actualizado);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al actualizar fiscal";
    return res.status(400).json({ message, error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al cambiar estado del fiscal";
    return res.status(400).json({ message, error: message });
  }
};

export const buscarFiscalPorDni = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { dni } = req.params;
    const asociacionId =
      typeof req.query.asociacion_id === "string" ? req.query.asociacion_id : null;
    const fiscal = await FiscalService.buscarPorDni(dni, asociacionId);
    if (!fiscal) {
      return res.status(200).json(null);
    }
    return res.status(200).json(fiscal);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al buscar fiscal";
    return res.status(500).json({ message, error: message });
  }
};

export const obtenerFiscalesTorneo = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const list = await FiscalService.obtenerFiscalesTorneo(id);
    return res.status(200).json(list);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al obtener fiscales del torneo";
    return res.status(500).json({ message, error: message });
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error al asignar fiscales";
    return res.status(400).json({ message, error: message });
  }
};
