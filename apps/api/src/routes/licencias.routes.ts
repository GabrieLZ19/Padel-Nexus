import { Router } from "express";
import { LicenciasController } from "../controllers/licencias.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  authenticate,
  authorize(["admin"]),
  LicenciasController.listarLicencias,
);
router.patch(
  "/:id/estado",
  authenticate,
  authorize(["admin"]),
  LicenciasController.cambiarEstadoLicencia,
);
router.post("/solicitar", authenticate, LicenciasController.solicitarLicencia);

router.get(
  "/verificacion/:usuario_id",
  authenticate,
  LicenciasController.obtenerDatosVerificacion,
);

export default router;
