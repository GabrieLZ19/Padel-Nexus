import { Router } from "express";
import { PartidosController } from "../controllers/partidos.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Rutas públicas de lectura
router.get("/abiertos", PartidosController.getPartidosAbiertos);

// Rutas protegidas (requieren autenticación)
router.post(
  "/publicar",
  authenticate,
  PartidosController.publicarPartidoAbierto,
);

// La nueva ruta para unirse
router.post(
  "/:partido_id/unirse",
  authenticate,
  PartidosController.unirseAPartido,
);

export default router;
