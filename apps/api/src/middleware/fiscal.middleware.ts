import { Request, Response, NextFunction } from "express";
import { FiscalSesionService, type FiscalSesion } from "../services/fiscal-sesion.service";
import { supabaseAdmin } from "../config/supabase";

declare global {
  namespace Express {
    interface Request {
      fiscal?: FiscalSesion;
      fiscalRolTorneo?: "general" | "auxiliar";
    }
  }
}

export const requireFiscal = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "No autorizado" });
  }

  const fiscal = await FiscalSesionService.obtenerFiscalActivoPorUsuario(userId);
  if (!fiscal) {
    return res.status(403).json({
      message: "Se requiere una ficha activa en el Colegio de Fiscales.",
    });
  }

  req.fiscal = fiscal;
  next();
};

export const requireFiscalAsignadoAlTorneo = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const fiscalId = req.fiscal?.id;
  const torneoId = req.params.id || req.params.torneoId;

  if (!fiscalId || !torneoId) {
    return res.status(400).json({ message: "Falta el torneo o la ficha del fiscal." });
  }

  const { data, error } = await supabaseAdmin
    .from("torneo_fiscales")
    .select("torneo_id, rol")
    .eq("torneo_id", torneoId)
    .eq("fiscal_id", fiscalId)
    .maybeSingle();

  if (error || !data) {
    return res.status(403).json({
      message: "No estás asignado a este torneo.",
    });
  }

  req.fiscalRolTorneo = data.rol === "general" ? "general" : "auxiliar";
  next();
};

export const requireFiscalGeneral = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (req.fiscalRolTorneo === "general") {
    return next();
  }

  const fiscalId = req.fiscal?.id;
  const torneoId = req.params.id || req.params.torneoId;

  if (!fiscalId || !torneoId) {
    return res.status(400).json({ message: "Falta el torneo o la ficha del fiscal." });
  }

  const { data, error } = await supabaseAdmin
    .from("torneo_fiscales")
    .select("rol")
    .eq("torneo_id", torneoId)
    .eq("fiscal_id", fiscalId)
    .maybeSingle();

  if (error || !data || data.rol !== "general") {
    return res.status(403).json({
      message: "Solo el Fiscal General puede revisar informes en este torneo.",
    });
  }

  req.fiscalRolTorneo = "general";
  next();
};
