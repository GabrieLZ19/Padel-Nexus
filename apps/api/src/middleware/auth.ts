import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import type { RolUsuario } from "../constants/roles";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string; rol?: RolUsuario };
    }
  }
}

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

  // getUser valida la firma criptográfica del token de forma ultra rápida
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: "No autorizado" });
  }

  // 🚀 MEJOR PRÁCTICA: Leemos el rol directo del JWT (app_metadata), ahorrándonos una query a la BD
  const rolDelUsuario = (user.app_metadata?.rol || "usuario") as RolUsuario;

  req.user = {
    id: user.id,
    email: user.email,
    rol: rolDelUsuario,
  };

  next();
};

export const authorize = (rolesPermitidos: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.rol) {
      return res.status(403).json({ message: "Acceso denegado" });
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        message: `Requiere uno de estos roles: ${rolesPermitidos.join(", ")}`,
      });
    }

    next();
  };
};
