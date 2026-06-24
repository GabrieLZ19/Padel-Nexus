import { Router } from "express";
import { RankingsController } from "../controllers/ranking.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// --- Rutas Públicas (Cualquier jugador o visitante puede ver las estadísticas) ---
router.get("/", RankingsController.obtenerRankingGlobal);
router.get("/:usuario_id", RankingsController.obtenerPerfilRanking);

// --- Rutas Administrativas Protegidas ---
router.post(
  "/actualizar-puntos",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  RankingsController.actualizarPuntosJugador,
);

export default router;
