import { Router } from "express";
import { PerfilController } from "../controllers/perfil.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Todas las rutas de perfiles requieren autenticación base
router.use(authenticate);

// Rutas de autogestión para el Jugador logueado
router.get("/me", PerfilController.getMiPerfil);
router.put("/me", PerfilController.updatePerfil);

// Rutas Administrativas (Ver perfiles y fichas de terceros)
router.get(
  "/:id",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  PerfilController.getPerfilById,
);

export default router;
