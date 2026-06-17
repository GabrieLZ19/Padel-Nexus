import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  generarCuadros,
  actualizarResultado,
  getPartidosByTorneo,
  getInscripcionesByTorneo,
} from "../controllers/torneos.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas públicas (Lectura)

router.get("/", getAllTorneos);
router.get(
  "/:id/inscripciones",
  authenticate,
  authorize(["admin", "moderador"]),
  getInscripcionesByTorneo,
);
router.get("/:id/partidos", getPartidosByTorneo);
router.get("/:id", getTorneoById);

// Rutas protegidas: 'admin' hace todo, 'moderador' solo gestiona datos
router.post("/", authenticate, authorize(["admin"]), createTorneo);
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "moderador"]),
  updateTorneo,
);
// router.put(
//   "/:id/estado",
//   authenticate,
//   authorize(["admin", "moderador"]),
//   updateTorneoEstado,
// );
router.delete("/:id", authenticate, authorize(["admin"]), deleteTorneo);

// Solo admins y moderadores pueden generar/alterar los cuadros

router.post(
  "/:id/generar-cuadro",
  authenticate,
  authorize(["admin", "moderador"]),
  generarCuadros,
);
router.put(
  "/partidos/:partido_id/resultado",
  authenticate,
  authorize(["admin", "moderador"]),
  actualizarResultado,
);

export default router;
