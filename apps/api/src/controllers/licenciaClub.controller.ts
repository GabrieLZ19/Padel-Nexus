import { Request, Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { LicenciaClubService } from "../services/licenciaClub.service";

async function clubIdAsignadoAlUsuario(userId: string): Promise<string | null> {
  const { data: perfil } = await supabaseAdmin
    .from("perfiles")
    .select("club_id")
    .eq("id", userId)
    .maybeSingle();
  return perfil?.club_id ? String(perfil.club_id) : null;
}

const ROLES_GESTION = [
  "superadmin",
  "admin_federacion",
  "admin_provincial",
] as const;

function puedeGestionar(rol?: string): boolean {
  return Boolean(rol && (ROLES_GESTION as readonly string[]).includes(rol));
}

async function validarLecturaLicenciaClub(
  req: Request,
  clubId: string,
  licenciaId: string,
): Promise<{ status: number; error: string } | null> {
  if (!clubId || !licenciaId) {
    return { status: 400, error: "Club y licencia son obligatorios." };
  }

  if (req.user?.rol === "admin_club" && req.user.id) {
    const clubUsuario = await clubIdAsignadoAlUsuario(req.user.id);
    if (String(clubUsuario || "") !== clubId) {
      return {
        status: 403,
        error: "No podés ver la licencia de otro club.",
      };
    }
  }

  const pertenece = await LicenciaClubService.licenciaPerteneceAClub(
    licenciaId,
    clubId,
  );
  if (!pertenece) {
    return { status: 404, error: "Licencia no encontrada para este club." };
  }

  return null;
}

export const LicenciaClubController = {
  async obtener(req: Request, res: Response): Promise<Response> {
    try {
      const clubId = String(req.params.id || "");
      if (!clubId) {
        return res
          .status(400)
          .json({ exito: false, error: "ID del club requerido." });
      }
      if (req.user?.rol === "admin_club" && req.user.id) {
        const clubUsuario = await clubIdAsignadoAlUsuario(req.user.id);
        if (String(clubUsuario || "") !== clubId) {
          return res
            .status(403)
            .json({ exito: false, error: "No podés ver la licencia de otro club." });
        }
      }
      let licencia = await LicenciaClubService.obtenerPorClubId(clubId);
      if (!licencia && puedeGestionar(req.user?.rol)) {
        licencia = await LicenciaClubService.asegurarLicenciaParaClub(clubId);
      }
      return res.status(200).json({ exito: true, data: licencia });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener licencia.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async actualizarEstado(req: Request, res: Response): Promise<Response> {
    try {
      if (!puedeGestionar(req.user?.rol)) {
        return res.status(403).json({ exito: false, error: "Sin permisos." });
      }
      const licenciaId = String(req.params.licenciaId || "");
      const { estado, fecha_vencimiento } = req.body as {
        estado?: string;
        fecha_vencimiento?: string;
      };
      if (!licenciaId || !estado) {
        return res.status(400).json({
          exito: false,
          error: "Licencia y estado son obligatorios.",
        });
      }
      const permitidos = ["Activa", "Pendiente", "Suspendida", "Vencida"];
      if (!permitidos.includes(estado)) {
        return res.status(400).json({ exito: false, error: "Estado inválido." });
      }
      const data = await LicenciaClubService.actualizarEstado(
        licenciaId,
        estado as "Activa" | "Pendiente" | "Suspendida" | "Vencida",
        fecha_vencimiento,
        req.user?.id,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar.";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async darDeBaja(req: Request, res: Response): Promise<Response> {
    try {
      if (!puedeGestionar(req.user?.rol)) {
        return res.status(403).json({ exito: false, error: "Sin permisos." });
      }
      const licenciaId = String(req.params.licenciaId || "");
      await LicenciaClubService.darDeBaja(licenciaId);
      return res.status(200).json({ exito: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo dar de baja.";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async registrarPago(req: Request, res: Response): Promise<Response> {
    try {
      if (!puedeGestionar(req.user?.rol)) {
        return res.status(403).json({ exito: false, error: "Sin permisos." });
      }
      const licenciaId = String(req.params.licenciaId || "");
      const data = await LicenciaClubService.registrarPago(
        licenciaId,
        req.body || {},
        req.user?.id,
      );
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "No se pudo registrar el pago.";
      return res.status(400).json({ exito: false, error: message });
    }
  },

  async listarPagos(req: Request, res: Response): Promise<Response> {
    try {
      const clubId = String(req.params.id || "");
      const licenciaId = String(req.params.licenciaId || "");
      const denegado = await validarLecturaLicenciaClub(req, clubId, licenciaId);
      if (denegado) {
        return res
          .status(denegado.status)
          .json({ exito: false, error: denegado.error });
      }
      const data = await LicenciaClubService.listarPagos(licenciaId);
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al listar pagos.";
      return res.status(500).json({ exito: false, error: message });
    }
  },

  async obtenerMiClub(req: Request, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          exito: false,
          error: "Sesión no válida.",
        });
      }
      const clubId = await clubIdAsignadoAlUsuario(userId);
      if (!clubId) {
        return res.status(400).json({
          exito: false,
          error: "Tu usuario no tiene un club asignado.",
        });
      }
      const data = await LicenciaClubService.obtenerPorClubId(String(clubId));
      return res.status(200).json({ exito: true, data });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al obtener licencia.";
      return res.status(500).json({ exito: false, error: message });
    }
  },
};
