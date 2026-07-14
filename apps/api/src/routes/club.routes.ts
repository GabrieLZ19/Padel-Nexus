import { Router } from "express";
import {
  getAllClubes,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
  getCanchasPorClub,
  createCancha,
  updateCancha,
  deleteCancha,
  createTurno,
  deleteTurno,
} from "../controllers/club.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas de lectura (Cualquier usuario logueado puede ver los clubes y sus canchas)
router.get("/", authenticate, getAllClubes);
router.get("/:id", authenticate, getClubById);
router.get("/:id/canchas", authenticate, getCanchasPorClub);

// Rutas protegidas de gestión de clubes (Solo administradores)
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

// Rutas protegidas de gestión de canchas y turnos (Para administradores de clubes)
router.post(
  "/:id/canchas",
  authenticate,
  authorize(["superadmin", "admin", "admin_club", "admin_provincial", "admin_federacion"]),
  createCancha,
);

router.put(
  "/canchas/:id",
  authenticate,
  authorize(["superadmin", "admin", "admin_club", "admin_provincial", "admin_federacion"]),
  updateCancha,
);

router.delete(
  "/canchas/:id",
  authenticate,
  authorize(["superadmin", "admin", "admin_club", "admin_provincial", "admin_federacion"]),
  deleteCancha,
);

router.post(
  "/canchas/:id/turnos",
  authenticate,
  authorize(["superadmin", "admin", "admin_club", "admin_provincial", "admin_federacion"]),
  createTurno,
);

router.delete(
  "/turnos/:id",
  authenticate,
  authorize(["superadmin", "admin", "admin_club", "admin_provincial", "admin_federacion"]),
  deleteTurno,
);

export default router;
