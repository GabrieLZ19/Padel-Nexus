import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const LicenciasController = {
  // Lista licencias con datos del perfil para el admin
  async listarLicencias(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from("licencias")
        .select(
          `
          id, nro_licencia, estado, fecha_emision, fecha_vencimiento,
          perfiles(nombre_completo, telefono)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al listar licencias", error: error.message });
    }
  },

  // Gestión profesional del estado con validación de fechas
  async cambiarEstadoLicencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado, fecha_vencimiento } = req.body;

      if (!estado) {
        return res.status(400).json({ message: "El estado es requerido." });
      }

      // Preparamos el objeto de actualización
      const updateData: any = { estado };

      // Si se está activando, podemos actualizar o refrescar la fecha de vencimiento
      if (fecha_vencimiento) {
        updateData.fecha_vencimiento = fecha_vencimiento;
      }

      const { data, error } = await supabase
        .from("licencias")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) throw error;
      return res.status(200).json({
        message: "Licencia actualizada con éxito",
        data: data ? data[0] : null,
      });
    } catch (error: any) {
      return res.status(500).json({
        message: "Error al actualizar licencia",
        error: error.message,
      });
    }
  },

  // Nueva funcionalidad: Crear solicitud de licencia (necesaria para el usuario)
  async solicitarLicencia(req: Request, res: Response) {
    try {
      const { usuario_id, nro_licencia } = req.body;

      const { data, error } = await supabase
        .from("licencias")
        .insert([
          {
            usuario_id,
            nro_licencia,
            estado: "Pendiente",
            fecha_emision: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      return res
        .status(201)
        .json({ message: "Solicitud enviada a revisión", data: data[0] });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al solicitar licencia", error: error.message });
    }
  },

  async obtenerDatosVerificacion(req: Request, res: Response) {
    try {
      const { usuario_id } = req.params;

      const { data, error } = await supabase
        .from("licencias")
        .select("estado, nro_licencia, perfiles(nombre_completo)")
        .eq("usuario_id", usuario_id)
        .single();

      if (error || !data) {
        return res.status(404).json({ message: "Licencia no encontrada" });
      }

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: "Error al verificar" });
    }
  },
};
