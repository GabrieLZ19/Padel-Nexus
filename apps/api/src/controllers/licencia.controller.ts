import { Request, Response } from "express";
import { LicenciaService } from "../services/licencia.service";

export const LicenciasController = {
  /**
   * 1. GET /api/licencias
   * Lista y pagina las licencias (Solo Admins)
   */
  async listar(req: Request, res: Response): Promise<Response> {
    try {
      const { page = "1", limit = "10", search } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);

      const resultado = await LicenciaService.obtenerLicencias(
        pageNum,
        limitNum,
        search as string | undefined,
      );

      return res.status(200).json({ exito: true, ...resultado });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error desconocido al listar licencias.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * 2. GET /api/licencias/:usuario_id
   * Obtiene la licencia específica de un usuario (Dueño o Admin)
   */
  async obtenerLicenciaPorUsuario(
    req: Request,
    res: Response,
  ): Promise<Response> {
    try {
      const { usuario_id } = req.params;

      if (!usuario_id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID de usuario es requerido." });
      }

      const data = await LicenciaService.obtenerPorUsuario(usuario_id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al obtener la licencia del usuario.";
      return res.status(404).json({ exito: false, error: message });
    }
  },

  /**
   * 3. POST /api/licencias
   * Forzar la creación de una licencia administrativamente (Solo Admins)
   */
  async crear(req: Request, res: Response): Promise<Response> {
    try {
      const { usuario_id, nro_licencia, estado } = req.body;

      if (!usuario_id || !nro_licencia) {
        return res
          .status(400)
          .json({
            exito: false,
            error: "El ID de usuario y el número de licencia son obligatorios.",
          });
      }

      const estadoPorDefecto = estado || "Activa";
      const data = await LicenciaService.crearLicencia(
        usuario_id,
        nro_licencia,
        estadoPorDefecto,
      );

      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al crear la licencia.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * 4. PUT /api/licencias/:id
   * Renueva el vencimiento de una licencia sumando un año exacto (Solo Admins)
   */
  async renovar(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      if (!id) {
        return res
          .status(400)
          .json({ exito: false, error: "El ID de la licencia es requerido." });
      }

      const data = await LicenciaService.renovar(id);
      return res.status(200).json({
        exito: true,
        mensaje: "Licencia renovada correctamente por 1 año.",
        data,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al renovar la licencia.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * 5. GET /api/licencias/verificacion/:usuario_id
   * Verificación en tiempo real y cálculo dinámico de vencimiento
   */
  async verificar(req: Request, res: Response): Promise<Response> {
    try {
      const { usuario_id } = req.params;

      if (!usuario_id) {
        return res
          .status(400)
          .json({
            exito: false,
            error: "El ID de usuario es requerido para la verificación.",
          });
      }

      const data = await LicenciaService.verificar(usuario_id);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al verificar el estado de la licencia.";
      return res.status(404).json({ exito: false, error: message });
    }
  },

  /**
   * 6. PATCH /api/licencias/:id/estado
   * Modifica el estado actual de la licencia (Activa, Vencida, Suspendida) (Solo Admins)
   */
  async cambiarEstadoLicencia(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { estado, fecha_vencimiento } = req.body;

      if (!id || !estado) {
        return res
          .status(400)
          .json({
            exito: false,
            error: "El ID de licencia y el nuevo estado son requeridos.",
          });
      }

      const data = await LicenciaService.actualizarEstado(id, estado, fecha_vencimiento);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al actualizar el estado de la licencia.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  /**
   * 7. POST /api/licencias/solicitar
   * Genera un trámite de autogestión de carnet con token alfanumérico (Jugador)
   */
  async solicitar(req: Request, res: Response): Promise<Response> {
    try {
      const { nombre, apellido, documento, provincia, club_id } = req.body;
      const usuario_id = req.user?.id;

      if (!usuario_id) {
        return res
          .status(401)
          .json({ exito: false, message: "Usuario no autenticado." });
      }

      if (!nombre || !apellido || !documento || !provincia || !club_id) {
        return res.status(400).json({
          exito: false,
          message:
            "Faltan datos obligatorios para la licencia (nombre, apellido, dni, provincia, club).",
        });
      }

      const datosSolicitud = { nombre, apellido, documento, provincia, club_id };
      const data = await LicenciaService.solicitar(
        usuario_id,
        datosSolicitud,
      );

      return res.status(201).json({
        exito: true,
        mensaje: "Solicitud de carnet federativo generada con éxito.",
        data,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al procesar la solicitud de licencia.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};
