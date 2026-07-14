import { Request, Response } from "express";
import { ClubService } from "../services/club.service";
import { supabaseAdmin } from "../config/supabase";

export class ClubPanelController {
  /**
   * Obtiene el club_id del usuario logueado.
   */
  private static async getClubIdDelUsuario(usuarioId: string): Promise<string> {
    const { data: perfil, error } = await supabaseAdmin
      .from("perfiles")
      .select("club_id")
      .eq("id", usuarioId)
      .single();

    if (error || !perfil || !perfil.club_id) {
      throw new Error("El usuario no tiene un club asignado.");
    }
    return perfil.club_id;
  }

  /**
   * GET /api/club/mi-club
   */
  static async obtenerMiClub(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const data = await ClubService.obtenerClubPorId(clubId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * PUT /api/club/mi-club
   */
  static async actualizarMiClub(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { nombre, provincia, localidad, latitud, longitud, cbu, alias } = req.body;

      const data = await ClubService.actualizarClub(clubId, {
        nombre,
        provincia,
        localidad,
        latitud,
        longitud,
        cbu,
        alias,
      });

      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * GET /api/club/mi-club/canchas
   */
  static async listarCanchas(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const data = await ClubService.obtenerCanchasPorClub(clubId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * POST /api/club/mi-club/canchas
   */
  static async crearCancha(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { nombre, tipo_suelo, techada } = req.body;

      if (!nombre) {
        return res.status(400).json({ exito: false, error: "El nombre es obligatorio." });
      }

      const data = await ClubService.crearCancha(clubId, { nombre, tipo_suelo, techada });
      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * PUT /api/club/mi-club/canchas/:canchaId
   */
  static async actualizarCancha(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { canchaId } = req.params;
      const { nombre, tipo_suelo, techada, activa } = req.body;

      // Verificar que la cancha pertenece a su club
      const { data: cancha } = await supabaseAdmin
        .from("canchas")
        .select("club_id")
        .eq("id", canchaId)
        .single();

      if (!cancha || cancha.club_id !== clubId) {
        return res.status(403).json({ exito: false, error: "No tiene acceso a esta cancha." });
      }

      const data = await ClubService.actualizarCancha(canchaId, { nombre, tipo_suelo, techada, activa });
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * DELETE /api/club/mi-club/canchas/:canchaId
   */
  static async eliminarCancha(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { canchaId } = req.params;

      // Verificar que la cancha pertenece a su club
      const { data: cancha } = await supabaseAdmin
        .from("canchas")
        .select("club_id")
        .eq("id", canchaId)
        .single();

      if (!cancha || cancha.club_id !== clubId) {
        return res.status(403).json({ exito: false, error: "No tiene acceso a esta cancha." });
      }

      await ClubService.eliminarCancha(canchaId);
      return res.status(200).json({ exito: true, message: "Cancha eliminada correctamente." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * POST /api/club/mi-club/canchas/:canchaId/turnos
   */
  static async crearTurno(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { canchaId } = req.params;
      const { hora_inicio, hora_fin, precio, dia_semana } = req.body;

      // Verificar que la cancha pertenece a su club
      const { data: cancha } = await supabaseAdmin
        .from("canchas")
        .select("club_id")
        .eq("id", canchaId)
        .single();

      if (!cancha || cancha.club_id !== clubId) {
        return res.status(403).json({ exito: false, error: "No tiene acceso a esta cancha." });
      }

      const data = await ClubService.crearTurno(canchaId, { hora_inicio, hora_fin, precio, dia_semana });
      return res.status(201).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * DELETE /api/club/mi-club/turnos/:turnoId
   */
  static async eliminarTurno(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { turnoId } = req.params;

      // Verificar que el turno pertenece a una cancha de su club
      const { data: turno } = await supabaseAdmin
        .from("turnos")
        .select("cancha_id, canchas(club_id)")
        .eq("id", turnoId)
        .single();

      if (!turno || (turno.canchas as any)?.club_id !== clubId) {
        return res.status(403).json({ exito: false, error: "No tiene acceso a este turno." });
      }

      await ClubService.eliminarTurno(turnoId);
      return res.status(200).json({ exito: true, message: "Turno eliminado correctamente." });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * GET /api/club/mi-club/reservas
   */
  static async obtenerReservas(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const { fecha, estado_pago, cancha_id, page, limit } = req.query;

      const filtros = {
        fecha: fecha as string | undefined,
        estado_pago: estado_pago as string | undefined,
        cancha_id: cancha_id as string | undefined,
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      };

      const data = await ClubService.obtenerReservasClub(clubId, filtros);
      return res.status(200).json({ exito: true, ...data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }

  /**
   * GET /api/club/mi-club/estadisticas
   */
  static async obtenerEstadisticas(req: Request, res: Response) {
    try {
      const clubId = await ClubPanelController.getClubIdDelUsuario(req.user!.id);
      const data = await ClubService.obtenerEstadisticasClub(clubId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      return res.status(400).json({ exito: false, error: message });
    }
  }
}
