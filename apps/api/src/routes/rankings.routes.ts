import { Router } from "express";
import { RankingsController } from "../controllers/rankings.controller";

const router = Router();

router.get("/", RankingsController.obtenerRankingGlobal);
router.post("/actualizar-puntos", RankingsController.actualizarPuntosJugador);

export default router;
