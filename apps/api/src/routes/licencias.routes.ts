import { Router } from "express";
import { LicenciasController } from "../controllers/licencias.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// --- Rutas Admin ---
router.get(
  "/",
  authenticate,
  authorize(["admin"]),
  LicenciasController.listarLicencias,
);
router.post(
  "/",
  authenticate,
  authorize(["admin"]),
  LicenciasController.crearLicenciaAdmin,
);
router.put(
  "/:id",
  authenticate,
  authorize(["admin"]),
  LicenciasController.renovarLicencia,
);
router.patch(
  "/:id/estado",
  authenticate,
  authorize(["admin"]),
  LicenciasController.cambiarEstadoLicencia,
);

router.get(
  "/verificacion/:usuario_id",
  authenticate,
  LicenciasController.obtenerDatosVerificacion,
);

// --- Rutas Usuario ---
router.post("/solicitar", authenticate, LicenciasController.solicitarLicencia);
router.get(
  "/:usuario_id",
  authenticate,
  LicenciasController.obtenerLicenciaPorUsuario,
);

export default router;
