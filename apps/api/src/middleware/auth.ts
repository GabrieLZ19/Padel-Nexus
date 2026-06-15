import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";

// Extendemos la interfaz de Request para que Express sepa que existe 'user'
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email?: string };
    }
  }
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json({ message: "No se proporcionó token de autenticación" });
  }

  const token = authHeader.split(" ")[1]; // Esperamos "Bearer <token>"

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ message: "Token inválido o expirado" });
  }

  // Inyectamos el usuario en el objeto req
  req.user = { id: user.id, email: user.email };
  next();
};

export const authorizeAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  // Primero debe haber pasado por 'authenticate'
  if (!req.user) return res.status(401).json({ message: "No autenticado" });

  // Verificamos el rol en la tabla 'perfiles'
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("rol")
    .eq("id", req.user.id)
    .single();

  if (perfil?.rol !== "admin") {
    return res
      .status(403)
      .json({ message: "Acceso denegado: Requiere rol de administrador" });
  }

  next();
};
