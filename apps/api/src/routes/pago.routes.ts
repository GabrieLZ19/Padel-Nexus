import { Router } from "express";
import { PagoController } from "../controllers/pago.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Todas las operaciones de caja y finanzas requieren verificación estricta de identidad
router.use(authenticate);

// Endpoint del Checkbox administrativo (Fase 1)
router.patch(
  "/confirmar-manual",
  authorize(["superadmin", "admin_federacion", "admin_provincial"]),
  PagoController.confirmarPagoManual,
);

export default router;
