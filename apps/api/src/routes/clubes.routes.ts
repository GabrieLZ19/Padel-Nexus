import { Router } from "express";
import {
  getAllClubes,
  getClubById,
  createClub,
  updateClub,
  deleteClub,
} from "../controllers/clubes.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas públicas o de usuario logueado (lectura)
router.get("/", authenticate, getAllClubes);
router.get("/:id", authenticate, getClubById);

// Rutas protegidas solo para Admin (escritura)
router.post("/", authenticate, authorize(["admin"]), createClub);
router.put("/:id", authenticate, authorize(["admin"]), updateClub);
router.delete("/:id", authenticate, authorize(["admin"]), deleteClub);

export default router;
