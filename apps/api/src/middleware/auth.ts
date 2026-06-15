import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string; rol?: string };
    }
  }
}

// Middleware de Autenticación Base
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Formato de token inválido" });
  }

  const token = authHeader.split(" ")[1];
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: "No autorizado" });
  }

  // Obtenemos el rol desde la base de datos de una vez
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", user.id)
    .single();

  req.user = { id: user.id, email: user.email, rol: perfil?.rol };
  next();
};

// Middleware de Autorización Flexible
export const authorize = (rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.rol) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res
        .status(403)
        .json({
          message: `Requiere uno de estos roles: ${rolesPermitidos.join(", ")}`,
        });
    }

    next();
  };
};
