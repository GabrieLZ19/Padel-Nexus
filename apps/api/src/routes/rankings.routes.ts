import { Router } from "express";
import { RankingsController } from "../controllers/rankings.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas Públicas
router.get("/", RankingsController.obtenerRankingGlobal);
router.get("/:usuario_id", RankingsController.obtenerPerfilRanking);

// Rutas Admin
router.post(
  "/actualizar-puntos",
  authenticate,
  authorize(["admin"]),
  RankingsController.actualizarPuntosJugador,
);

export default router;
