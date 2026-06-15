import { Router } from "express";
import { RankingsController } from "../controllers/rankings.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", RankingsController.obtenerRankingGlobal);
// Solo un admin o un proceso interno debe poder actualizar puntos
router.post(
  "/actualizar-puntos",
  authenticate,
  authorize(["admin"]),
  RankingsController.actualizarPuntosJugador,
);

export default router;
