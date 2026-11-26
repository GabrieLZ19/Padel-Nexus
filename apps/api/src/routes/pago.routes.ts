import { Router } from "express";
import { PagoController } from "../controllers/pago.controller";
import { authenticate, authorize } from "../middleware/auth";
import { ROLES_ADMINISTRATIVOS } from "../constants/roles";

const router = Router();

// Todas las operaciones de caja y finanzas requieren verificación estricta de identidad
router.use(authenticate);

// Endpoint del Checkbox administrativo (Fase 1)
router.patch(
  "/confirmar-manual",
  authorize(ROLES_ADMINISTRATIVOS),
  PagoController.confirmarPagoManual,
);

export default router;
