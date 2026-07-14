import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { env } from "./config/env.config";

// Importación de rutas
import torneosRoutes from "./routes/torneo.routes";
import rankingsRoutes from "./routes/ranking.routes";
import licenciasRoutes from "./routes/licencia.routes";
import clubesRoutes from "./routes/club.routes";
import inscripcionesRoutes from "./routes/inscripcion.routes";
import partidosRoutes from "./routes/partido.routes";
import reservasRoutes from "./routes/reserva.routes";
import perfilRoutes from "./routes/perfil.routes";
import adminRoutes from "./routes/admin.routes";
import pagosRoutes from "./routes/pago.routes";
import notificacionesRoutes from "./routes/notificacion.routes";
import chatRoutes from "./routes/chat.routes";
import clubPanelRoutes from "./routes/club-panel.routes";
import { createServer } from "http";
import { SocketService } from "./services/socket.service";

const app = express();
const server = createServer(app);

// Inicializar Socket.io
SocketService.init(server, env.FRONTEND_URL);

// Configuración de Middlewares
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

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
app.use("/api/partidos", partidosRoutes);
app.use("/api/reservas", reservasRoutes);
app.use("/api/perfil", perfilRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pagos", pagosRoutes);
app.use("/api/notificaciones", notificacionesRoutes);
app.use("/api/mensajes", chatRoutes);
app.use("/api/club", clubPanelRoutes);

// Manejador global de errores (Debe ir después de todas las rutas)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("🚨 Error capturado:", err.stack);
  res.status(500).json({
    message: "Error interno del servidor",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Inicio del servidor
server.listen(env.PORT, () => {
  console.log(
    `🚀 Servidor de Pádel Nexus corriendo en http://localhost:${env.PORT}`,
  );
});
