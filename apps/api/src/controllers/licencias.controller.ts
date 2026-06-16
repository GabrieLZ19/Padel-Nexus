import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const LicenciasController = {
  // 1. GET /api/licencias (Listar)
  async listarLicencias(req: Request, res: Response) {
    try {
      const { data, error } = await supabase
        .from("licencias")
        .select(
          `
          *,
          perfiles(nombre_completo, telefono, email, categoria_padel)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al listar", error: error.message });
    }
  },

  // 2. GET /api/licencias/:usuario_id (Obtener del usuario)
  async obtenerLicenciaPorUsuario(req: Request, res: Response) {
    try {
      const { usuario_id } = req.params;
      const { data, error } = await supabase
        .from("licencias")
        .select("*")
        .eq("usuario_id", usuario_id)
        .single();

      if (error)
        return res.status(404).json({ message: "Licencia no encontrada" });
      return res.status(200).json(data);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al obtener", error: error.message });
    }
  },

  // 3. POST /api/licencias (Crear - Admin)
  async crearLicenciaAdmin(req: Request, res: Response) {
    try {
      const { usuario_id, nro_licencia, estado } = req.body;
      const { data, error } = await supabase
        .from("licencias")
        .insert([
          {
            usuario_id,
            nro_licencia,
            estado: estado || "Activa",
            fecha_emision: new Date().toISOString(),
          },
        ])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al crear licencia", error: error.message });
    }
  },

  // 4. PUT /api/licencias/:id (Renovar)
  async renovarLicencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const nuevaFechaVencimiento = new Date();
      nuevaFechaVencimiento.setFullYear(
        nuevaFechaVencimiento.getFullYear() + 1,
      );

      const { data, error } = await supabase
        .from("licencias")
        .update({
          fecha_vencimiento: nuevaFechaVencimiento.toISOString(),
          estado: "Activa",
        })
        .eq("id", id)
        .select();

      if (error) throw error;
      return res
        .status(200)
        .json({ message: "Licencia renovada", data: data[0] });
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al renovar", error: error.message });
    }
  },
  // 5. GET /api/licencias/verificacion/:usuario_id
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

      // Lógica de validación dinámica en servidor
      const esVencida = new Date(data.fecha_vencimiento) < new Date();
      if (esVencida && data.estado === "Activa") {
        data.estado = "Vencida";
      }

      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: "Error al verificar licencia" });
    }
  },

  // MÉTODOS EXISTENTES
  async cambiarEstadoLicencia(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      const { data, error } = await supabase
        .from("licencias")
        .update({ estado })
        .eq("id", id)
        .select();
      if (error) throw error;
      return res.status(200).json(data[0]);
    } catch (error: any) {
      return res
        .status(500)
        .json({ message: "Error al actualizar", error: error.message });
    }
  },

  async solicitarLicencia(req: Request, res: Response) {
    try {
      const usuario_id = req.user?.id;
      const { nombre_completo, documento, provincia, club_id } = req.body;
      const { data, error } = await supabase
        .from("licencias")
        .insert([
          {
            usuario_id,
            estado: "Pendiente",
            nro_licencia: `PAD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            datos_solicitud: { nombre_completo, documento, provincia, club_id },
          },
        ])
        .select();

      if (error) throw error;
      res.status(201).json(data[0]);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error al solicitar", error: error.message });
    }
  },
};
