import express from "express";
import cors from "cors";
import { env } from "./config/env.config";
import torneosRoutes from "./routes/torneos.routes";
import rankingsRoutes from "./routes/rankings.routes";
import licenciasRoutes from "./routes/licencias.routes";
import clubesRoutes from "./routes/clubes.routes";
import inscripcionesRoutes from "./routes/inscripciones.routes";

const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());

// Registro de todas las rutas del Bloque 1
app.use("/api/torneos", torneosRoutes);
app.use("/api/rankings", rankingsRoutes);
app.use("/api/licencias", licenciasRoutes);
app.use("/api/clubes", clubesRoutes);
app.use("/api/inscripciones", inscripcionesRoutes);

app.listen(env.PORT, () => {
  console.log(
    `🚀 Servidor de Pádel Nexus corriendo en http://localhost:${env.PORT}`,
  );
});
