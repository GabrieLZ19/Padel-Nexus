import { Request, Response } from "express";
import { PerfilService } from "../services/perfil.service";

export const PerfilController = {
  /**
   * 1. GET /api/perfiles/me
   * Retorna el perfil del usuario autenticado leyendo el ID desde el token JWT
   */
  async getMiPerfil(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ exito: false, error: "Usuario no autorizado." });
      }

      const perfil = await PerfilService.obtenerPerfilCompleto(userId);
      return res.status(200).json({ exito: true, data: perfil });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener tu perfil.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * 2. GET /api/perfiles/:id
   * Permite a administradores consultar fichas técnicas de otros jugadores
   */
  async getPerfilById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      if (!id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID del perfil es requerido." });
      }

      const perfil = await PerfilService.obtenerPerfilCompleto(id);
      return res.status(200).json({ exito: true, data: perfil });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al obtener el perfil solicitado.";
      return res.status(404).json({ exito: false, error: message });
    }
  },

  /**
   * 3. PUT /api/perfiles/me
   * Modifica los datos personales del usuario autenticado
   */
  async updatePerfil(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res
          .status(401)
          .json({ exito: false, error: "Usuario no autorizado." });
      }

      const {
        nombre_completo,
        telefono,
        categoria_padel,
        lado_preferido,
        lugar_residencia,
        dni,
      } = req.body;

      const perfilActualizado = await PerfilService.actualizarDatosPerfil(
        userId,
        {
          nombre_completo,
          telefono,
          categoria_padel,
          lado_preferido,
          lugar_residencia,
          dni,
        },
      );

      return res.status(200).json({
        exito: true,
        mensaje: "Perfil actualizado con éxito.",
        data: perfilActualizado,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar los datos de tu perfil.";
      return res.status(400).json({ exito: false, error: message });
    }
  },
};
