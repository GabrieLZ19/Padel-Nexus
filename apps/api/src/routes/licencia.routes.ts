import { Router } from "express";
import { LicenciasController } from "../controllers/licencia.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Todas las rutas de licencias requieren autenticación base
router.use(authenticate);

// --- Rutas Administrativas (Protegidas con roles específicos FAP) ---
router.get(
  "/",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  LicenciasController.listar,
);

router.post(
  "/",
  authorize(["superadmin", "admin_federacion"]),
  LicenciasController.crear,
);

router.put(
  "/:id",
  authorize(["superadmin", "admin_federacion"]),
  LicenciasController.renovar,
);

router.patch(
  "/:id/estado",
  authorize(["superadmin", "admin_federacion"]),
  LicenciasController.cambiarEstadoLicencia,
);

// --- Rutas de Gestión del Jugador (Autogestión y Verificaciones) ---
router.post("/solicitar", LicenciasController.solicitar);
router.get("/verificacion/:usuario_id", LicenciasController.verificar);
router.get("/:usuario_id", LicenciasController.obtenerLicenciaPorUsuario);

export default router;
