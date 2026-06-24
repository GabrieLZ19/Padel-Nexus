import { Router } from "express";
import { PartidosController } from "../controllers/partido.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Rutas Públicas (Los usuarios pueden buscar partidos sin estar logueados)
router.get("/abiertos", PartidosController.getPartidosAbiertos);

// Rutas Protegidas (Requieren cuenta para interactuar)
router.use(authenticate);

router.post("/publicar", PartidosController.publicarPartidoAbierto);
router.post("/:partido_id/unirse", PartidosController.unirseAPartido);

export default router;
