import { Router } from "express";
import {
  getMiPerfil,
  getPerfilById,
  updatePerfil,
} from "../controllers/perfil.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Rutas del usuario autenticado
router.get("/me", authenticate, getMiPerfil);
router.put("/me", authenticate, updatePerfil);

// Rutas del admin
router.get("/:id", authenticate, authorize(["admin"]), getPerfilById);

export default router;
