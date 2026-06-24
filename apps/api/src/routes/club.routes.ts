import { Router } from "express";
import {
  getAllClubes,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
} from "../controllers/club.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas de lectura (Cualquier usuario logueado puede ver los clubes)
router.get("/", authenticate, getAllClubes);
router.get("/:id", authenticate, getClubById);

// Rutas protegidas (Solo administradores de nivel regional o nacional pueden gestionar clubes)
router.post(
  "/",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  createClub,
);

router.put(
  "/:id",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  updateClub,
);

router.delete(
  "/:id",
  authenticate,
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  deleteClub,
);

export default router;
