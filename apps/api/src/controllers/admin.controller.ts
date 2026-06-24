import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";

export const AdminController = {
  /**
   * PUT /api/admin/override/partidos/:partido_id
   * Permite alterar un partido a mano registrando al responsable en la auditoría
   */
  async overridePartido(req: Request, res: Response): Promise<Response> {
    try {
      const { partido_id } = req.params;
      const { equipo_a_id, equipo_b_id, estado_partido, notas } = req.body;
      const usuarioAdminId = req.user?.id;

      if (!partido_id || !usuarioAdminId) {
        return res
          .status(400)
          .json({
            exito: false,
            error: "Parámetros administrativos insuficientes.",
          });
      }

      const partidoModificado = await AdminService.realizarOverridePartido({
        partidoId: partido_id,
        usuarioAdminId,
        nuevoEquipoAId: equipo_a_id,
        nuevoEquipoBId: equipo_b_id,
        nuevoEstado: estado_partido,
        notas,
      });

      return res.status(200).json({
        exito: true,
        mensaje:
          "Modificación manual (Override) aplicada y auditada correctamente.",
        data: partidoModificado,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al procesar el override.";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  /**
   * GET /api/admin/audit/torneos/:torneo_id
   * Devuelve los logs para el panel de fiscalización oficial del CRM
   */
  async getLogsAuditoria(req: Request, res: Response): Promise<Response> {
    try {
      const { torneo_id } = req.params;
      if (!torneo_id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID del torneo es requerido." });
      }

      const logs = await AdminService.obtenerLogsTorneo(torneo_id);
      return res.status(200).json({ exito: true, data: logs });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al consultar los logs.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};
