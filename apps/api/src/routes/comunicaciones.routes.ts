import { Router } from "express";
import { ComunicacionesController } from "../controllers/comunicaciones.controller";
import { COMUNICACIONES_ROLES_PERMITIDOS } from "../constants/comunicaciones";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.use(authorize(COMUNICACIONES_ROLES_PERMITIDOS));

router.get("/contactos", ComunicacionesController.buscarContactos);

router.get("/listas", ComunicacionesController.listarListas);
router.get("/listas/:id", ComunicacionesController.obtenerLista);
router.post("/listas", ComunicacionesController.crearLista);
router.patch("/listas/:id", ComunicacionesController.actualizarLista);
router.delete("/listas/:id", ComunicacionesController.eliminarLista);

router.post("/audiencia/preview", ComunicacionesController.previewAudiencia);

router.get("/campanas", ComunicacionesController.listarCampanas);
router.post("/campanas", ComunicacionesController.enviarCampana);

export default router;
