import { Request, Response } from "express";
import { AdminService } from "../services/admin.service";
import { CrmDashboardService } from "../services/crm-dashboard.service";
import {
  CrmContactosService,
  type FiltroContactoCrm,
} from "../services/crm-contactos.service";
import {
  type ComunicacionesEtiqueta,
  esEtiquetaComunicacionValida,
} from "../constants/comunicaciones";

export const AdminController = {
  async listarContactos(req: Request, res: Response): Promise<Response> {
    try {
      const {
        page = "1",
        limit = "25",
        search,
        filtro = "todos",
        etiqueta,
      } = req.query;

      const filtroNormalizado: FiltroContactoCrm =
        filtro === "con_licencia" || filtro === "sin_licencia"
          ? filtro
          : "todos";

      let etiquetaFiltro: ComunicacionesEtiqueta | undefined;
      if (typeof etiqueta === "string" && esEtiquetaComunicacionValida(etiqueta)) {
        etiquetaFiltro = etiqueta;
      }

      const resultado = await CrmContactosService.listar(
        Number(page),
        Number(limit),
        typeof search === "string" ? search : undefined,
        filtroNormalizado,
        etiquetaFiltro,
      );

      return res.status(200).json({ exito: true, ...resultado });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar contactos.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async actualizarEtiquetasContacto(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { perfil_id } = req.params;
      const { etiquetas } = req.body as { etiquetas?: string[] };
      if (!perfil_id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID del contacto es requerido." });
      }
      const normalizadas = (etiquetas || []).filter(
        (e): e is ComunicacionesEtiqueta => esEtiquetaComunicacionValida(e),
      );
      const data = await CrmContactosService.actualizarEtiquetas(
        perfil_id,
        normalizadas,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron actualizar las etiquetas.";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async getCrmMetricas(_req: Request, res: Response): Promise<Response> {
    try {
      const data = await CrmDashboardService.obtenerMetricas();
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener métricas del CRM.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

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
