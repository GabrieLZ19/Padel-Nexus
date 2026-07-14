import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../config/supabase";

/**
 * Middleware para validar que un usuario con rol 'admin_club' solo pueda operar
 * sobre su propio club. Los roles administrativos superiores (admin, superadmin, etc.)
 * tienen acceso total.
 * 
 * @param sourceIdLocation Indica de dónde extraer el club_id a comparar ('params.id', 'body.club_id', 'query.club_id', etc.)
 */
export const authorizeClub = (sourceIdLocation: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "No autorizado" });
      }

      // Los administradores de federación y superiores tienen acceso total a todos los clubes
      if (
        user.rol === "superadmin" ||
        user.rol === "admin_federacion" ||
        user.rol === "admin_provincial" ||
        user.rol === "admin"
      ) {
        return next();
      }

      if (user.rol !== "admin_club") {
        return res.status(403).json({ message: "Acceso denegado: Rol insuficiente" });
      }

      // Obtener el club_id que se quiere operar desde la request
      let targetClubId: string | undefined;
      const parts = sourceIdLocation.split(".");
      if (parts[0] === "params") {
        targetClubId = req.params[parts[1]];
      } else if (parts[0] === "body") {
        targetClubId = req.body[parts[1]];
      } else if (parts[0] === "query") {
        targetClubId = req.query[parts[1]] as string;
      }

      if (!targetClubId) {
        return res.status(400).json({ message: "ID de club objetivo no especificado" });
      }

      // Consultar el club_id asignado al perfil del usuario
      const { data: perfil, error } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", user.id)
        .single();

      if (error || !perfil || !perfil.club_id) {
        return res.status(403).json({ message: "Acceso denegado: El usuario no tiene un club asignado" });
      }

      if (perfil.club_id !== targetClubId) {
        return res.status(403).json({
          message: "Acceso denegado: No tiene permisos para gestionar este club",
        });
      }

      next();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      return res.status(500).json({ message: "Error interno de autorización de club", error: msg });
    }
  };
};
