import { Router } from "express";
import { NotificacionesController } from "../controllers/notificacion.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

// Todas las rutas de notificaciones requieren autenticación
router.use(authenticate);

router.get("/", NotificacionesController.listar);
router.patch("/:id/leida", NotificacionesController.marcarLeida);
router.post("/leidas-todas", NotificacionesController.marcarTodasLeidas);
router.delete("/:id", NotificacionesController.eliminar);

export default router;
