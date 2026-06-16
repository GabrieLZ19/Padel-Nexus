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
      const { estado } = req.body; // 'activa', 'suspendida', 'vencida'

      const updateData: any = { estado };

      // Lógica de negocio: Si se aprueba, calculamos vencimiento a 1 año
      if (estado === "activa") {
        const fechaVencimiento = new Date();
        fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
        updateData.fecha_vencimiento = fechaVencimiento.toISOString();
      }

      const { data, error } = await supabase
        .from("licencias")
        .update(updateData)
        .eq("id", id)
        .select();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Estado actualizado", data: data ? data[0] : null });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al actualizar", error: error.message });
    }
  },

  async solicitarLicencia(req: Request, res: Response) {
    try {
      const usuario_id = req.user?.id;
      // Extraemos los datos que vienen desde el frontend
      const { nombre_completo, documento, club } = req.body;

      const { data, error } = await supabase
        .from("licencias")
        .insert([
          {
            usuario_id,
            estado: "Pendiente",
            nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            // Guardamos todo en la nueva columna JSONB
            datos_solicitud: { nombre_completo, documento, club },
            fecha_emision: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      res.status(201).json({ message: "Solicitud enviada", data: data[0] });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error al solicitar", error: error.message });
    }
  },

  async obtenerDatosVerificacion(req: Request, res: Response) {
    try {
      const { usuario_id } = req.params;
      const { data, error } = await supabase
        .from("licencias")
        .select(
          "estado, nro_licencia, fecha_vencimiento, perfiles(nombre_completo)",
        )
        .eq("usuario_id", usuario_id)
        .single();

      if (error || !data)
        return res.status(404).json({ message: "Licencia no encontrada" });

      // Validación en tiempo real antes de responder
      const esVencida = new Date(data.fecha_vencimiento) < new Date();
      if (esVencida && data.estado === "activa") {
        data.estado = "vencida"; // Validamos el estado real al vuelo
      }

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: "Error al verificar" });
    }
  },
};
