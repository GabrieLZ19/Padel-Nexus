import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env.config";

const supabase = createClient(env.SUPABASE.URL, env.SUPABASE.SERVICE_KEY);

export const LicenciasController = {
  // Para ver quién pidió el alta de la licencia en el CRM
  async listarLicencias(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from("licencias")
        .select("*, perfiles(nombre_completo, email)");

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },

  // Para aprobar, rechazar o suspender desde el panel de control
  async cambiarEstadoLicencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado } = req.body; // 'Activa', 'Vencida', etc.

      if (!estado) {
        return res.status(400).json({ message: "El estado es requerido." });
      }

      const { data, error } = await supabase
        .from("licencias")
        .update({ estado })
        .eq("id", id)
        .select();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Estado de licencia actualizado", data: data[0] });
    } catch (error: any) {
      return res.status(500).json({ message: error.message });
    }
  },
};
