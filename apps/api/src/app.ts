import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env.config";

// Importación de rutas
import torneosRoutes from "./routes/torneos.routes";
import rankingsRoutes from "./routes/rankings.routes";
import licenciasRoutes from "./routes/licencias.routes";
import clubesRoutes from "./routes/clubes.routes";
import inscripcionesRoutes from "./routes/inscripciones.routes";

const app = express();

// Configuración de Middlewares
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());

// Endpoint de salud para monitoreo (Health Check)
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Registro de Rutas
app.use("/api/torneos", torneosRoutes);
app.use("/api/rankings", rankingsRoutes);
app.use("/api/licencias", licenciasRoutes);
app.use("/api/clubes", clubesRoutes);
app.use("/api/inscripciones", inscripcionesRoutes);

// Manejador global de errores (Debe ir después de todas las rutas)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🚨 Error capturado:", err.stack);
  res.status(500).json({
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Inicio del servidor
app.listen(env.PORT, () => {
  console.log(
    `🚀 Servidor de Pádel Nexus corriendo en http://localhost:${env.PORT}`,
  );
});
