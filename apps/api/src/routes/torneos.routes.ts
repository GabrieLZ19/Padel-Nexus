import { Router } from "express";
import {
  getAllTorneos,
  getTorneoById,
  createTorneo,
  updateTorneo,
  deleteTorneo,
  getPartidosByTorneo,
} from "../controllers/torneos.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", getAllTorneos);
router.get("/:id", getTorneoById);
router.get("/:id/partidos", getPartidosByTorneo);

// Rutas protegidas: 'admin' hace todo, 'moderador' solo gestiona datos
router.post("/", authenticate, authorize(["admin"]), createTorneo);
router.put(
  "/:id",
  authenticate,
  authorize(["admin", "moderador"]),
  updateTorneo,
);
router.delete("/:id", authenticate, authorize(["admin"]), deleteTorneo);

export default router;
