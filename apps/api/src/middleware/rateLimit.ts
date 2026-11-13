import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function resolverIpCliente(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const partes = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) {
      return partes[partes.length - 1] || req.ip || "unknown";
    }
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    const partes = String(forwarded[0])
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) {
      return partes[partes.length - 1] || req.ip || "unknown";
    }
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export function resolverIpClienteDesdeRequest(req: Request): string {
  return resolverIpCliente(req);
}

export function crearRateLimiter(opciones: {
  windowMs: number;
  max: number;
  clave?: string;
  extraBucketKey?: (req: Request) => string | null;
}) {
  const { windowMs, max, clave = "default", extraBucketKey } = opciones;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = resolverIpCliente(req);
    const extra = extraBucketKey?.(req);
    const bucketKey = extra ? `${clave}:${extra}:${ip}` : `${clave}:${ip}`;
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
