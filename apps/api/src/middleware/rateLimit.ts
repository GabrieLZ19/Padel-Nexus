import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function resolverIpCliente(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(",")[0]?.trim() || "unknown";
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function crearRateLimiter(opciones: {
  windowMs: number;
  max: number;
  clave?: string;
}) {
  const { windowMs, max, clave = "default" } = opciones;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = resolverIpCliente(req);
    const bucketKey = `${clave}:${ip}`;
    const ahora = Date.now();
    const bucket = buckets.get(bucketKey);

    if (!bucket || ahora >= bucket.resetAt) {
      buckets.set(bucketKey, { count: 1, resetAt: ahora + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      res.status(429).json({
        exito: false,
        error:
          "Demasiados intentos. Esperá unos minutos antes de volver a intentar.",
      });
      return;
    }

    bucket.count += 1;
    next();
  };
}
